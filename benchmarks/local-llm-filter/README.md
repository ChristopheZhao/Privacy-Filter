# Local LLM Filter Benchmark

This benchmark validates whether the app should move from regex-led filtering to a local-LLM-led filtering workflow.

Important boundary:

- The benchmark exists to choose a default model recommendation and a default deep-filter strategy.
- The product architecture should still expose provider and model selection.
- The benchmark runner currently uses `ollama` as its first implemented provider, but that does not mean the app is intended to stay single-provider forever.
- To avoid mixed-localhost ambiguity, canonical comparison runs should be generated from one environment where the benchmark runner, Node runtime, and Ollama service share the same network context.

## Goal

Compare these variants under the same runtime and scoring rules:

- `regex`
- `regex + qwen3.5:2b`
- `regex + qwen3.5:4b`
- `regex + gemma4:e4b`
- `pure + qwen3.5:4b`
- `pure + qwen3.5:4b + priors`
- `pure + qwen3.5:4b + priors-v2`
- `pure + qwen3.5:4b + priors-v3`
- `pure + qwen3.5:4b + priors-v4`

The benchmark is designed to answer four questions:

1. Does any LLM-backed workflow materially outperform the current regex baseline on contextual privacy?
2. Does `qwen3.5:4b` justify its extra cost compared with `qwen3.5:2b`?
3. At the same class, should the default model be `qwen3.5:4b` or `gemma4:e4b`?
4. Should deep filtering ship as a broad `regex + LLM` merge, or as a pure-LLM extraction path with stronger prompt guardrails?

## Structure

- `dataset/`
  Benchmark corpus definition and labeled samples.
- `schemas/`
  JSON schema contracts for benchmark samples, model findings, and scored results.
- `prompts/`
  The fixed extraction prompts used by the LLM-backed variants.
- `variants.json`
  The compared benchmark variants and fixed runtime settings.
- `results/`
  Generated benchmark reports and run artifacts.

## Evaluation Rules

- All LLM variants use Ollama.
- All LLM variants must use the same chunking rules and JSON output schema.
- Thinking-capable models must be benchmarked with `think: false` unless a variant explicitly overrides it, because the product workflow needs direct structured extraction instead of long reasoning traces.
- The model must never rewrite the full input text.
- The benchmark scores structured findings plus locally executed replacement behavior.
- Final default-model and default-strategy choices follow the gates in [PLAN-20260418-local-llm-filter-benchmark-spec.md](../../docs/plans/active/PLAN-20260418-local-llm-filter-benchmark-spec.md).

## Running the Benchmark

Regex baseline only:

```bash
npm run bench:local-llm-filter -- --variant regex
```

All variants:

```bash
npm run bench:local-llm-filter
```

Selected variants:

```bash
npm run bench:local-llm-filter -- --variant "pure+qwen3.5:4b" --variant "pure+qwen3.5:4b+priors-v2"
```

## Provider Prerequisites

V1 uses a provider abstraction with `ollama` as the first implementation.
The benchmark runner talks to the provider over HTTP, so the provider can run on Windows or WSL as long as the configured `base_url` is reachable from the benchmark process.

This is a benchmark-runner choice, not a product lock-in. The app-level local-LLM configuration is still designed around provider selection.

Expected default endpoint:

```text
http://127.0.0.1:11434
```

Before running any LLM-backed variant, make sure:

1. Ollama is installed.
2. The Ollama service is running.
3. The compared models are pulled.

Typical commands:

```bash
ollama pull qwen3.5:2b
ollama pull qwen3.5:4b
ollama pull gemma4:e4b
ollama serve
```

If the provider is unreachable, the runner fails fast with a provider healthcheck error instead of silently producing invalid benchmark data.

## Current Status

This directory contains the benchmark contract, labeled starter corpus, prompt variants, and generated reports for Sprint 1.
The harness reads `dataset/samples.jsonl`, executes each variant through a provider abstraction, and writes normalized reports into `results/`.

Current starter-set reference runs:

- `benchmarks/local-llm-filter/results/full-benchmark-20260419-think-false.summary.md`
- `benchmarks/local-llm-filter/results/full-benchmark-20260419-22samples.summary.md`
- `benchmarks/local-llm-filter/results/full-benchmark-20260419-33samples.summary.md`
- `benchmarks/local-llm-filter/results/full-benchmark-20260419-48samples.summary.md`
- `benchmarks/local-llm-filter/results/full-benchmark-20260419-60samples.summary.md`
- `benchmarks/local-llm-filter/results/pure-llm-priors-v2-20260419.summary.md`
- `benchmarks/local-llm-filter/results/pure-qwen-fallback-priors-v2-20260419-rerun.summary.md`
- `benchmarks/local-llm-filter/results/pure-qwen-priors-v2-v3-20260419.summary.md`
- `benchmarks/local-llm-filter/results/pure-qwen-priors-v3-v4-20260419.summary.md`
- `benchmarks/local-llm-filter/results/pure-qwen-priors-v2-v4-postprocess-20260419.summary.md`

Current pause-point leader under the production-like Ollama request shape:

- `pure + qwen3.5:4b + priors-v4 + post-processing`

The current repo starter set contains `60` samples. This is a reasonable pause point for model-selection work: the next step is no longer "blindly add more samples", but to implement the chosen deep-filter strategy and then resume expansion toward the 140-sample decision target if the product needs a stronger evidence bar before release.

Implementation note:

- The benchmark runner now resolves model findings from either `anchor_text` or `text`, matching the shipped Rust resolver contract. This matters for smaller models such as `qwen3.5:2b`, which sometimes omit `anchor_text` but still return usable exact spans in `text`.
- The benchmark runner also applies a small deterministic post-processing layer before scoring: unsupported labels are dropped, and nested `IP_ADDRESS` / `PORT` / `SENSITIVE_VALUE` spans are removed when a `DATABASE_URL` already covers the same DSN. The shipped Rust backend now mirrors this behavior.
