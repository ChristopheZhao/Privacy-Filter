import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { extractRegexFindings } from './lib/regex.js';
import { createProvider } from './lib/providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_CATEGORIES = {
  contextual: new Set(['contextual', 'mixed-noisy']),
  deterministic: new Set(['deterministic', 'code-config-log']),
};
const ALLOWED_LABELS = new Set([
  'NAME',
  'ADDRESS',
  'PHONE_NUMBER',
  'EMAIL',
  'ID_CARD',
  'PASSPORT_NUMBER',
  'BANK_CARD',
  'WECHAT_ID',
  'QQ_NUMBER',
  'API_KEY',
  'PUBLIC_KEY',
  'SENSITIVE_VALUE',
  'DATABASE_URL',
  'DATABASE_CONFIG',
  'IP_ADDRESS',
  'PORT',
  'API_ENDPOINT',
  'CONFIG_VALUE',
  'ORG_NAME',
  'ACCOUNT_IDENTIFIER',
]);

const sanitizeVariantId = (value) => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');

const toIsoStamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const toExcerpt = (value, maxLength = 320) => {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
};

const parseArgs = (argv) => {
  const options = {
    variants: [],
    sampleIds: [],
    outputName: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--variant':
        options.variants.push(argv[index + 1]);
        index += 1;
        break;
      case '--sample':
        options.sampleIds.push(argv[index + 1]);
        index += 1;
        break;
      case '--output-name':
        options.outputName = argv[index + 1];
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
};

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(__dirname, relativePath), 'utf8'));

const readJsonl = async (relativePath) =>
  (await readFile(path.join(__dirname, relativePath), 'utf8'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

const parsePromptSections = (content) => {
  const systemMatch = content.match(/## System\s+([\s\S]*?)## User Template/);
  const userMatch = content.match(/## User Template\s+([\s\S]*)$/);

  return {
    systemPrompt: systemMatch?.[1]?.trim() ?? '',
    userTemplate: userMatch?.[1]?.trim() ?? '',
  };
};

const loadPromptSections = async (promptFile = 'prompts/extraction-prompt.md') => {
  const promptContent = await readFile(path.join(__dirname, promptFile), 'utf8');
  return parsePromptSections(promptContent);
};

const validateSamples = (samples) => {
  for (const sample of samples) {
    if (!sample.id || !sample.text || !Array.isArray(sample.expected_spans)) {
      throw new Error(`Invalid sample shape for ${sample.id ?? '<missing-id>'}`);
    }

    for (const span of sample.expected_spans) {
      const actual = sample.text.slice(span.start, span.end);
      if (actual !== span.text) {
        throw new Error(
          `Span mismatch in ${sample.id}: expected "${span.text}" at ${span.start}-${span.end}, got "${actual}"`
        );
      }
    }
  }
};

const collectOccurrences = (text, needle) => {
  if (!needle) {
    return [];
  }

  const hits = [];
  let cursor = 0;
  while (cursor < text.length) {
    const next = text.indexOf(needle, cursor);
    if (next === -1) {
      break;
    }
    hits.push(next);
    cursor = next + Math.max(1, needle.length);
  }
  return hits;
};

const scoreOccurrence = (text, start, finding) => {
  let score = 0;

  if (finding.context_before) {
    const beforeWindow = text.slice(Math.max(0, start - Math.max(32, finding.context_before.length + 8)), start);
    if (beforeWindow.endsWith(finding.context_before)) {
      score += 3;
    } else if (beforeWindow.includes(finding.context_before)) {
      score += 1;
    }
  }

  if (finding.context_after) {
    const end = start + finding.anchor_text.length;
    const afterWindow = text.slice(end, end + Math.max(32, finding.context_after.length + 8));
    if (afterWindow.startsWith(finding.context_after)) {
      score += 3;
    } else if (afterWindow.includes(finding.context_after)) {
      score += 1;
    }
  }

  return score;
};

const resolveLlmFindings = (text, findings) => {
  const resolved = [];
  const unresolved = [];

  for (const finding of findings) {
    const anchorText =
      typeof finding?.anchor_text === 'string' && finding.anchor_text
        ? finding.anchor_text
        : typeof finding?.text === 'string' && finding.text
          ? finding.text
          : '';

    if (
      !finding ||
      typeof finding.label !== 'string' ||
      !anchorText
    ) {
      unresolved.push({ finding, reason: 'invalid_finding_shape' });
      continue;
    }

    const candidates = collectOccurrences(text, anchorText);
    if (candidates.length === 0) {
      unresolved.push({ finding, reason: 'anchor_not_found' });
      continue;
    }

    if (candidates.length === 1) {
      const start = candidates[0];
      resolved.push({
        label: finding.label,
        start,
        end: start + anchorText.length,
        text: anchorText,
        replacement: finding.replacement ?? `[${finding.label}]`,
        confidence: Number.isFinite(finding.confidence) ? finding.confidence : 0,
        source: 'llm',
        reason: finding.reason ?? '',
      });
      continue;
    }

    const ranked = candidates
      .map((start) => ({
        start,
        score: scoreOccurrence(text, start, finding),
      }))
      .sort((left, right) => right.score - left.score);

    if (ranked.length > 1 && ranked[0].score === ranked[1].score) {
      unresolved.push({ finding, reason: 'ambiguous_anchor' });
      continue;
    }

    const best = ranked[0];
    if (best.score <= 0) {
      unresolved.push({ finding, reason: 'ambiguous_anchor' });
      continue;
    }

    resolved.push({
      label: finding.label,
      start: best.start,
      end: best.start + anchorText.length,
      text: anchorText,
      replacement: finding.replacement ?? `[${finding.label}]`,
      confidence: Number.isFinite(finding.confidence) ? finding.confidence : 0,
      source: 'llm',
      reason: finding.reason ?? '',
    });
  }

  return { resolved, unresolved };
};

const findingContains = (parent, child) =>
  parent.start <= child.start && child.end <= parent.end;

const postProcessResolvedFindings = (resolved) => {
  const databaseUrls = resolved.filter((finding) => finding.label === 'DATABASE_URL');

  return resolved.filter((finding) => {
    if (!ALLOWED_LABELS.has(finding.label)) {
      return false;
    }

    if (!['IP_ADDRESS', 'PORT', 'SENSITIVE_VALUE'].includes(finding.label)) {
      return true;
    }

    return !databaseUrls.some(
      (databaseUrl) =>
        databaseUrl.text !== finding.text &&
        finding.label !== 'DATABASE_URL' &&
        findingContains(databaseUrl, finding)
    );
  });
};

const dedupeSpans = (spans) => {
  const seen = new Set();
  return spans
    .slice()
    .sort((left, right) => left.start - right.start || left.end - right.end || left.label.localeCompare(right.label))
    .filter((span) => {
      const key = `${span.label}:${span.start}:${span.end}:${span.text}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const isMatchingSpan = (left, right) =>
  left.label === right.label && left.start === right.start && left.end === right.end;

const scoreSample = (
  sample,
  resolvedSpans,
  parseOk,
  unresolvedCount,
  rawFindingCount,
  elapsedMs,
  providerDebug = null
) => {
  const expectedAll = sample.expected_spans;
  const expectedRequired = expectedAll.filter((span) => span.required);
  const predicted = dedupeSpans(resolvedSpans);

  const matchedPredictionIndexes = new Set();
  const matchedExpectedIndexes = new Set();

  expectedAll.forEach((expectedSpan, expectedIndex) => {
    const predictionIndex = predicted.findIndex((prediction, index) => {
      if (matchedPredictionIndexes.has(index)) {
        return false;
      }
      return isMatchingSpan(expectedSpan, prediction);
    });

    if (predictionIndex !== -1) {
      matchedPredictionIndexes.add(predictionIndex);
      matchedExpectedIndexes.add(expectedIndex);
    }
  });

  const tp = matchedPredictionIndexes.size;
  const fp = predicted.length - tp;
  const fn = expectedRequired.filter((expectedSpan) =>
    !predicted.some((prediction) => isMatchingSpan(expectedSpan, prediction))
  ).length;

  const falsePositiveSpans = predicted.filter(
    (prediction) => !expectedAll.some((expectedSpan) => isMatchingSpan(expectedSpan, prediction))
  );

  return {
    sample_id: sample.id,
    category: sample.category,
    resolved_spans: predicted,
    unresolved_findings: unresolvedCount,
    parse_ok: parseOk,
    raw_finding_count: rawFindingCount,
    elapsed_ms: elapsedMs,
    tp,
    fp,
    fn,
    expected_required: expectedRequired.length,
    expected_total: expectedAll.length,
    false_positive_spans: falsePositiveSpans,
    provider_debug: providerDebug,
  };
};

const summarizeVariant = (variant, sampleResults, samples, machine, runtime) => {
  const totals = {
    tp: 0,
    fp: 0,
    fn: 0,
    expectedRequired: 0,
    parseOk: 0,
    rawFindingCount: 0,
    unresolvedCount: 0,
    contextualRequired: 0,
    contextualMatched: 0,
    deterministicRequired: 0,
    deterministicMatched: 0,
    negativeSamples: 0,
    negativeSamplesWithFalsePositive: 0,
    replacementCorruptionCount: 0,
  };

  const elapsedValues = [];

  sampleResults.forEach((result) => {
    totals.tp += result.tp;
    totals.fp += result.fp;
    totals.fn += result.fn;
    totals.expectedRequired += result.expected_required;
    totals.parseOk += result.parse_ok ? 1 : 0;
    totals.rawFindingCount += result.raw_finding_count;
    totals.unresolvedCount += result.unresolved_findings;
    totals.replacementCorruptionCount += result.false_positive_spans.length;
    elapsedValues.push(result.elapsed_ms);

    if (result.category === 'negative') {
      totals.negativeSamples += 1;
      if (result.false_positive_spans.length > 0) {
        totals.negativeSamplesWithFalsePositive += 1;
      }
    }
  });

  samples.forEach((sample) => {
    const matchingResult = sampleResults.find((result) => result.sample_id === sample.id);
    const expectedRequired = sample.expected_spans.filter((span) => span.required);
    const matchedRequired = expectedRequired.filter((expectedSpan) =>
      matchingResult.resolved_spans.some((prediction) => isMatchingSpan(expectedSpan, prediction))
    ).length;

    if (DATASET_CATEGORIES.contextual.has(sample.category)) {
      totals.contextualRequired += expectedRequired.length;
      totals.contextualMatched += matchedRequired;
    }

    if (DATASET_CATEGORIES.deterministic.has(sample.category)) {
      totals.deterministicRequired += expectedRequired.length;
      totals.deterministicMatched += matchedRequired;
    }
  });

  const precision = totals.tp === 0 && totals.fp === 0 ? 1 : totals.tp / Math.max(1, totals.tp + totals.fp);
  const recall = totals.tp === 0 && totals.fn === 0 ? 1 : totals.tp / Math.max(1, totals.tp + totals.fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const sortedElapsed = elapsedValues.slice().sort((left, right) => left - right);
  const p95Index = sortedElapsed.length === 0 ? 0 : Math.min(sortedElapsed.length - 1, Math.ceil(sortedElapsed.length * 0.95) - 1);

  return {
    variant_id: variant.id,
    model: variant.model,
    provider: runtime.provider,
    machine,
    sample_count: sampleResults.length,
    precision,
    recall,
    f1,
    contextual_privacy_recall:
      totals.contextualRequired === 0 ? 1 : totals.contextualMatched / totals.contextualRequired,
    deterministic_category_recall:
      totals.deterministicRequired === 0 ? 1 : totals.deterministicMatched / totals.deterministicRequired,
    parse_success_rate: sampleResults.length === 0 ? 1 : totals.parseOk / sampleResults.length,
    unresolved_finding_rate:
      totals.rawFindingCount === 0 ? 0 : totals.unresolvedCount / totals.rawFindingCount,
    false_positive_rate_on_negative_samples:
      totals.negativeSamples === 0 ? 0 : totals.negativeSamplesWithFalsePositive / totals.negativeSamples,
    average_latency_ms:
      elapsedValues.length === 0 ? 0 : elapsedValues.reduce((sum, value) => sum + value, 0) / elapsedValues.length,
    p95_latency_ms: sortedElapsed[p95Index] ?? 0,
    replacement_corruption_count: totals.replacementCorruptionCount,
  };
};

const toPercent = (value) => `${(value * 100).toFixed(2)}%`;

const renderSummaryMarkdown = (report) => {
  const lines = [
    '# Local LLM Filter Benchmark Summary',
    '',
    `- Generated At: ${report.generated_at}`,
    `- Provider: ${report.provider}`,
    `- Dataset Samples: ${report.dataset.sample_count}`,
    '',
    '| Variant | Recall | Precision | F1 | Contextual Recall | Deterministic Recall | Parse Success | Negative FP Rate | Avg Latency | P95 Latency |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const variant of report.variants) {
    lines.push(
      `| ${variant.variant_id} | ${toPercent(variant.recall)} | ${toPercent(variant.precision)} | ${toPercent(
        variant.f1
      )} | ${toPercent(variant.contextual_privacy_recall)} | ${toPercent(
        variant.deterministic_category_recall
      )} | ${toPercent(variant.parse_success_rate)} | ${toPercent(
        variant.false_positive_rate_on_negative_samples
      )} | ${variant.average_latency_ms.toFixed(2)} ms | ${variant.p95_latency_ms.toFixed(2)} ms |`
    );
  }

  lines.push('', '## Machine', '', `- Platform: ${report.machine.platform}`, `- Arch: ${report.machine.arch}`);

  return `${lines.join('\n')}\n`;
};

const runVariant = async ({ variant, samples, provider, runtime }) => {
  const results = [];

  for (const sample of samples) {
    const regexResolved = variant.use_regex_prefilter
      ? extractRegexFindings(sample.text).map((span) => ({
          ...span,
          source: 'regex',
        }))
      : [];

    if (!variant.use_llm) {
      results.push(
        scoreSample(sample, regexResolved, true, 0, 0, 0, {
          request_timeout_ms: 0,
          think: false,
          raw_excerpt: '',
          thinking_excerpt: '',
          error: '',
        })
      );
      continue;
    }

    const analysis = await provider.analyzeText(sample.text, variant, runtime);
    const { resolved, unresolved } = resolveLlmFindings(sample.text, analysis.findings);
    const merged = dedupeSpans([...regexResolved, ...postProcessResolvedFindings(resolved)]);
    const providerDebug = {
      request_timeout_ms: variant.timeout_ms ?? runtime.timeout_ms ?? 30000,
      think: variant.think ?? runtime.think ?? false,
      raw_excerpt: toExcerpt(analysis.rawContent),
      thinking_excerpt: toExcerpt(analysis.rawThinking),
      error: analysis.error ?? '',
    };

    results.push(
      scoreSample(
        sample,
        merged,
        analysis.parseOk,
        unresolved.length,
        analysis.findings.length,
        analysis.elapsedMs,
        providerDebug
      )
    );
  }

  return results;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const variantsConfig = await readJson('variants.json');
  const findingsSchema = await readJson('schemas/model-findings.schema.json');
  const samples = await readJsonl('dataset/samples.jsonl');
  validateSamples(samples);

  const selectedSamples =
    options.sampleIds.length === 0
      ? samples
      : samples.filter((sample) => options.sampleIds.includes(sample.id));

  if (selectedSamples.length === 0) {
    throw new Error('No benchmark samples selected.');
  }

  const selectedVariants =
    options.variants.length === 0
      ? variantsConfig.variants
      : variantsConfig.variants.filter((variant) => options.variants.includes(variant.id));

  if (selectedVariants.length === 0) {
    throw new Error('No benchmark variants selected.');
  }

  const promptCache = new Map();
  const getPromptSections = async (variant) => {
    const promptFile = variant.prompt_file ?? 'prompts/extraction-prompt.md';
    if (!promptCache.has(promptFile)) {
      promptCache.set(promptFile, await loadPromptSections(promptFile));
    }
    return promptCache.get(promptFile);
  };

  if (selectedVariants.some((variant) => variant.use_llm)) {
    const llmVariant = selectedVariants.find((variant) => variant.use_llm);
    const provider = createProvider(
      variantsConfig.runtime,
      await getPromptSections(llmVariant),
      findingsSchema
    );
    const providerStatus = await provider.healthcheck();
    if (!providerStatus.ok) {
      throw new Error(
        `Provider healthcheck failed for "${variantsConfig.runtime.provider}" at ${variantsConfig.runtime.base_url}: ${providerStatus.message}`
      );
    }
  }

  const machine = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    total_memory_gb: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)),
    node_version: process.version,
  };

  const report = {
    generated_at: new Date().toISOString(),
    provider: variantsConfig.runtime.provider,
    machine,
    dataset: {
      sample_count: selectedSamples.length,
      sample_ids: selectedSamples.map((sample) => sample.id),
    },
    variants: [],
  };

  const detailedResults = {};

  for (const variant of selectedVariants) {
    const provider = createProvider(
      variantsConfig.runtime,
      await getPromptSections(variant),
      findingsSchema
    );
    const sampleResults = await runVariant({
      variant,
      samples: selectedSamples,
      provider,
      runtime: variantsConfig.runtime,
    });

    report.variants.push(summarizeVariant(variant, sampleResults, selectedSamples, machine, variantsConfig.runtime));
    detailedResults[variant.id] = sampleResults;
  }

  const outputStem =
    options.outputName ??
    `${toIsoStamp()}-${selectedVariants.length === 1 ? sanitizeVariantId(selectedVariants[0].id) : 'all-variants'}`;
  const resultsDir = path.join(__dirname, 'results');
  await mkdir(resultsDir, { recursive: true });

  const summaryJsonPath = path.join(resultsDir, `${outputStem}.summary.json`);
  const detailJsonPath = path.join(resultsDir, `${outputStem}.details.json`);
  const summaryMarkdownPath = path.join(resultsDir, `${outputStem}.summary.md`);

  await writeFile(summaryJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(detailJsonPath, `${JSON.stringify(detailedResults, null, 2)}\n`, 'utf8');
  await writeFile(summaryMarkdownPath, renderSummaryMarkdown(report), 'utf8');

  console.log(`summary: ${summaryJsonPath}`);
  console.log(`details: ${detailJsonPath}`);
  console.log(`markdown: ${summaryMarkdownPath}`);
};

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exit(1);
});
