# Sprint 1 Contract: Local LLM Filter Benchmark and Selection Spec

- Related Plan ID: PLAN-20260418-LOCAL-LLM-FILTER
- Slice Title: Benchmark, compare, and choose the default local model before integration
- Status: in_progress
- Updated At: 2026-04-19T04:24:00Z

## 1. Slice Contract

### What
Close the model-selection uncertainty for local LLM filtering by defining one reproducible benchmark that compares the current regex baseline with `qwen3.5:2b`, `qwen3.5:4b`, and `gemma4:e4b` under the same runtime, prompt, schema, and scoring rules.

### Why
This boundary exists because backend and frontend integration work should consume a measured default model choice instead of re-opening model arguments during implementation. If this slice stays vague, later work will mix architecture changes with unresolved model-selection risk.

### Done Signals
- A benchmark corpus format is defined and checked into the repo.
- Annotation rules define how to mark exact spans, labels, and allowed ambiguity.
- All four variants share one normalized output schema and one scoring path.
- Pass/fail and default-selection gates are written down before any benchmark results are interpreted.
- The benchmark report format captures recall, precision, F1, structured-output success rate, unresolved rate, latency, and memory.

### Evidence Checklist
- `docs/plans/active/PLAN-20260418-local-llm-filter-benchmark-spec.md`
- Future harness path: `benchmarks/local-llm-filter/`
- Future result path: `benchmarks/local-llm-filter/results/`
- Current pipeline refs:
  `src/components/TextFilter/index.jsx`
  `src/components/TextFilter/privacyRules.js`
  `src-tauri/src/lib.rs`

### Negative Cases
- Model choice is made from subjective impressions, download counts, or isolated anecdotes instead of benchmark data.
- Different model variants are tested with different prompts, schemas, or runtime settings.
- The benchmark measures only overall F1 and hides contextual-privacy recall, structured-output failures, or unresolved replacements.
- The evaluation allows the model to rewrite full text instead of scoring structured findings plus local replacement behavior.

### Suggested Checkpoints
- `benchmark-spec-review`
- `annotation-scheme-review`
- `baseline-results-review`
- `default-model-decision-review`

### Next Owner
Default Codex execution in the current window

## 2. Benchmark Scope

### Compared Variants
- `regex`
- `regex + qwen3.5:2b`
- `regex + qwen3.5:4b`
- `regex + gemma4:e4b`

### Fixed Conditions
- Runtime: `Ollama`
- LLM temperature: `0`
- Structured output: JSON schema enforced
- Thinking mode: `think: false` for thinking-capable models unless a benchmark variant explicitly tests another setting
- Prompt goal: extract sensitive spans, never rewrite the full input
- Replacement execution: performed locally by the app or harness, not by the model
- Chunking strategy: identical for all LLM variants
- Machine metadata: always record CPU, RAM, GPU, OS, and Ollama version alongside results

### Out of Scope for Sprint 1
- Fine-tuning any model
- Cloud APIs
- Shipping model weights with the desktop app
- Comparing more than the three LLM candidates above
- Real-time per-keystroke inference UX

## 3. Corpus Design

### Target Size
- Initial decision set: `140` labeled samples
- Stretch target after first pass: `200` labeled samples if the first decision is inconclusive

### Corpus Mix
- `30` deterministic structured samples
  Phone numbers, email, API keys, IPs, DB URLs, env vars, IDs
- `40` contextual Chinese privacy samples
  Names, addresses, companies, relationships, role descriptions, account mentions in natural language
- `30` code, config, and log samples
  JSON, YAML, `.env`, stack traces, API configs, mixed code comments
- `20` clean negative samples
  Text that should survive unchanged
- `20` mixed noisy long-form samples
  Chat logs, tickets, copied docs, multiline configs, and hybrid text/code content

### Language Mix
- At least `70%` Simplified Chinese
- Up to `30%` English or mixed Chinese-English content

### Benchmark File Shape
Use JSONL with one sample per line:

```json
{
  "id": "cn-context-001",
  "language": "zh-CN",
  "domain": "chat",
  "text": "联系人张三，电话13800138000，住在杭州市西湖区某某路。",
  "expected_spans": [
    {
      "label": "NAME",
      "start": 3,
      "end": 5,
      "text": "张三",
      "replacement": "[NAME]",
      "required": true
    },
    {
      "label": "PHONE_NUMBER",
      "start": 8,
      "end": 19,
      "text": "13800138000",
      "replacement": "[PHONE_NUMBER]",
      "required": true
    }
  ],
  "notes": "Contextual name plus deterministic phone"
}
```

## 4. Label Taxonomy

### Core Labels
- `NAME`
- `ADDRESS`
- `PHONE_NUMBER`
- `EMAIL`
- `ID_CARD`
- `PASSPORT_NUMBER`
- `BANK_CARD`
- `WECHAT_ID`
- `QQ_NUMBER`
- `API_KEY`
- `SENSITIVE_VALUE`
- `DATABASE_URL`
- `DATABASE_CONFIG`
- `IP_ADDRESS`
- `PORT`
- `API_ENDPOINT`
- `CONFIG_VALUE`
- `ORG_NAME`
- `ACCOUNT_IDENTIFIER`

### Annotation Rules
- Ground truth uses exact `start` and `end` offsets.
- `required=true` marks spans whose miss counts as a false negative.
- When one string could fit multiple labels, prefer the most privacy-specific label.
- Overlapping spans are allowed only when one is structurally nested and both are useful for local replacement.
- Clean negative samples must contain `expected_spans: []`.
- Notes should explain ambiguous samples so future labels stay stable.

## 5. Model Output Contract

The LLM must return findings only. It must not return a rewritten paragraph.

```json
{
  "findings": [
    {
      "label": "NAME",
      "anchor_text": "张三",
      "replacement": "[NAME]",
      "confidence": 0.93,
      "reason": "真实姓名",
      "context_before": "联系人",
      "context_after": "，电话"
    }
  ]
}
```

### Normalized Scoring Record
The harness converts regex and model output into one normalized record:

```json
{
  "sample_id": "cn-context-001",
  "variant": "regex+qwen3.5:4b",
  "resolved_spans": [
    {
      "label": "NAME",
      "start": 3,
      "end": 5,
      "text": "张三",
      "replacement": "[NAME]",
      "confidence": 0.93,
      "source": "llm"
    }
  ],
  "unresolved_findings": [],
  "parse_ok": true,
  "elapsed_ms": 1320
}
```

## 6. Metrics

### Primary Metrics
- Entity-level `recall`
- Entity-level `precision`
- Entity-level `F1`
- Contextual-privacy recall
- Structured-output parse success rate
- Unresolved finding rate

### Secondary Metrics
- Average latency
- P95 latency
- Peak memory usage
- False-positive rate on clean negative samples
- Replacement corruption count
  Number of cases where local replacement changes unrelated text

## 7. Decision Gates

### Eligibility Gate for Any LLM Default
- Structured-output parse success rate `>= 98%`
- Unresolved finding rate `<= 5%`
- Deterministic-category recall after regex + LLM merge must not drop by more than `2` percentage points from pure `regex`
- Contextual-privacy recall must improve by at least `15` percentage points over pure `regex`
- False-positive rate on clean negative samples must stay `<= 8%`

### Qwen 4B vs Qwen 2B Gate
Choose `qwen3.5:4b` over `qwen3.5:2b` only if at least one is true and no eligibility gate is violated:
- Overall F1 improves by `>= 3` points
- Contextual-privacy recall improves by `>= 5` points
- Replacement corruption count is lower by a meaningful margin of at least `20%`

And both must also hold:
- P95 latency is not worse than `1.75x` the 2B result on the same machine
- Peak memory is not worse than `2x` the 2B result on the same machine

### Qwen 4B vs Gemma 4 E4B Gate
Between eligible 4B-class candidates, select the default using this order:
1. Higher contextual-privacy recall
2. Higher overall F1
3. Higher parse success rate
4. Lower P95 latency
5. Lower peak memory

If the top two candidates differ by less than `1` F1 point and less than `3` contextual-recall points, prefer the faster and lighter one.

## 8. Benchmark Report Format

Each run report must include:
- Variant name
- Runtime and model version
- Machine metadata
- Dataset version and sample count
- Recall, precision, F1
- Contextual-privacy recall
- Deterministic-category recall
- Parse success rate
- Unresolved finding rate
- Negative-sample false-positive rate
- Average latency
- P95 latency
- Peak memory
- Decision note

## 9. Next Execution Step

Expand the benchmark beyond the starter set:
- Grow `benchmarks/local-llm-filter/dataset/samples.jsonl` toward the 140-sample decision target
- Preserve the same prompt, provider config, and scoring path
- Re-run the compared variants using `think: false`
- Confirm or overturn the current provisional leader `qwen3.5:4b`

## 10. Progress Note

The repo now contains the Sprint 1 benchmark skeleton:

- `benchmarks/local-llm-filter/README.md`
- `benchmarks/local-llm-filter/dataset/README.md`
- `benchmarks/local-llm-filter/dataset/samples.jsonl`
- `benchmarks/local-llm-filter/prompts/extraction-prompt.md`
- `benchmarks/local-llm-filter/schemas/*.json`
- `benchmarks/local-llm-filter/variants.json`
- `benchmarks/local-llm-filter/run-benchmark.js`
- `benchmarks/local-llm-filter/lib/providers/`

The repo also now has a provider-based runner that keeps model loading behind a configurable provider boundary, with `ollama` as the first implementation.

Regex baseline smoke result on the starter dataset:

- Recall: `52.63%`
- Precision: `66.67%`
- F1: `58.82%`
- Contextual privacy recall: `12.50%`
- Deterministic category recall: `81.82%`
- Negative-sample false-positive rate: `0.00%`

The first comparison closure for this slice is now complete on the 10-sample starter set, and the next closure is to repeat the same comparison on the larger decision corpus.

10-sample starter-set results after pinning `think: false`:

- `regex`: recall `52.63%`, contextual recall `12.50%`, F1 `58.82%`
- `regex + qwen3.5:2b`: recall `57.89%`, contextual recall `25.00%`, F1 `59.46%`, unresolved finding rate `66.67%`
- `regex + qwen3.5:4b`: recall `84.21%`, contextual recall `62.50%`, F1 `74.42%`, unresolved finding rate `0.00%`
- `regex + gemma4:e4b`: recall `63.16%`, contextual recall `37.50%`, F1 `63.16%`, unresolved finding rate `72.22%`

Current starter-set verdict:

- Provisional default candidate: `qwen3.5:4b`
- Provisional fallback candidate: `qwen3.5:2b`
- `gemma4:e4b` remains in the comparison set, but on the starter set it is no longer competitive once all models run with `think: false`

Sprint 1 is still open because the starter corpus has only `10` samples versus the `140`-sample decision target.

22-sample rerun results:

- `regex`: recall `44.19%`, contextual recall `9.52%`, F1 `52.78%`
- `regex + qwen3.5:2b`: recall `51.16%`, contextual recall `23.81%`, F1 `55.00%`, unresolved finding rate `67.86%`
- `regex + qwen3.5:4b`: recall `81.40%`, contextual recall `61.90%`, F1 `76.92%`, unresolved finding rate `0.00%`
- `regex + gemma4:e4b`: recall `72.09%`, contextual recall `61.90%`, F1 `71.26%`, unresolved finding rate `58.14%`

Current 22-sample verdict:

- Strong provisional default candidate: `qwen3.5:4b`
- Provisional low-latency fallback: `qwen3.5:2b`
- `gemma4:e4b` remains competitive on contextual recall, but on this corpus it trails `qwen3.5:4b` on overall F1 and deterministic recall while also violating the unresolved-finding gate

Sprint 1 remains open because the labeled corpus is now `22` samples, still well below the `140`-sample decision target.

Current environment note:

- WSL benchmark execution works for the regex baseline.
- LLM-backed variants now fail fast with a provider healthcheck error when Ollama is unavailable.
- Windows-backed Ollama benchmarking is now working and produced a first comparison run at `benchmarks/local-llm-filter/results/full-benchmark-20260419.summary.md`.
- The first run strongly favored `gemma4:e4b`, but a follow-up diagnosis found that `qwen3.5` was benchmarked without explicitly disabling thinking, so the runner now pins `think: false` and stores provider-level debug excerpts.
- The second run at `benchmarks/local-llm-filter/results/full-benchmark-20260419-think-false.summary.md` is the current benchmark reference for runtime behavior on this machine.
- The latest expanded-corpus reference is `benchmarks/local-llm-filter/results/full-benchmark-20260419-22samples.summary.md`.
