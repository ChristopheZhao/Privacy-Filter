# Local LLM Evaluation

This document records why the app exposes a provider-driven local-LLM configuration instead of hard-coding one model path.

## Product Principle

- Benchmarking exists to choose a sensible default, not to lock the product to one model forever.
- The desktop app should expose local provider and model selection in configuration.
- The current implementation keeps `ollama` as the first working provider, but the backend command surface is intentionally shaped around provider selection so more local runtimes can be added later.

## Current Benchmark Scope

Compared variants:

- `regex`
- `regex + qwen3.5:2b`
- `regex + qwen3.5:4b`
- `regex + gemma4:e4b`
- `pure + qwen3.5:4b`
- `pure + qwen3.5:4b + priors`
- `pure + qwen3.5:4b + priors-v2`

Benchmark assets live under:

- `benchmarks/local-llm-filter/`

## Current Reference Runs

### 10-sample starter set

Reference:

- `benchmarks/local-llm-filter/results/full-benchmark-20260419-think-false.summary.md`

Headline result:

- `qwen3.5:4b` moved into the lead once `think: false` was enforced for thinking-capable models.

### 22-sample expanded starter set

Reference:

- `benchmarks/local-llm-filter/results/full-benchmark-20260419-22samples.summary.md`

Headline metrics:

| Variant | Recall | Precision | F1 | Contextual Recall | Deterministic Recall | Parse Success | Avg Latency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `regex` | `44.19%` | `65.52%` | `52.78%` | `9.52%` | `77.27%` | `100.00%` | `0 ms` |
| `regex + qwen3.5:2b` | `51.16%` | `59.46%` | `55.00%` | `23.81%` | `77.27%` | `100.00%` | `855.05 ms` |
| `regex + qwen3.5:4b` | `81.40%` | `72.92%` | `76.92%` | `61.90%` | `100.00%` | `100.00%` | `1190.41 ms` |
| `regex + gemma4:e4b` | `72.09%` | `70.45%` | `71.26%` | `61.90%` | `81.82%` | `100.00%` | `1412.18 ms` |

### 33-sample diversified starter set

Reference:

- `benchmarks/local-llm-filter/results/full-benchmark-20260419-33samples.summary.md`

Headline metrics:

| Variant | Recall | Precision | F1 | Contextual Recall | Deterministic Recall | Parse Success | Negative FP Rate | Avg Latency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `regex` | `45.95%` | `73.91%` | `56.67%` | `15.79%` | `77.78%` | `100.00%` | `0.00%` | `0.00 ms` |
| `regex + qwen3.5:2b` | `55.41%` | `68.33%` | `61.19%` | `34.21%` | `77.78%` | `100.00%` | `0.00%` | `842.24 ms` |
| `regex + qwen3.5:4b` | `78.38%` | `76.32%` | `77.33%` | `60.53%` | `97.22%` | `100.00%` | `0.00%` | `1202.48 ms` |
| `regex + gemma4:e4b` | `71.62%` | `73.61%` | `72.60%` | `57.89%` | `86.11%` | `100.00%` | `20.00%` | `1497.30 ms` |

### 48-sample diversified starter set

Reference:

- `benchmarks/local-llm-filter/results/full-benchmark-20260419-48samples.summary.md`

Environment note:

- This reference run was produced in the Windows host environment so the benchmark runner, Node runtime, and Ollama service shared the same localhost context.

Headline metrics:

| Variant | Recall | Precision | F1 | Contextual Recall | Deterministic Recall | Parse Success | Negative FP Rate | Avg Latency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `regex` | `46.02%` | `77.61%` | `57.78%` | `17.54%` | `75.00%` | `100.00%` | `0.00%` | `0.00 ms` |
| `regex + qwen3.5:2b` | `55.75%` | `71.59%` | `62.69%` | `33.33%` | `78.57%` | `100.00%` | `0.00%` | `825.98 ms` |
| `regex + qwen3.5:4b` | `76.99%` | `76.99%` | `76.99%` | `63.16%` | `91.07%` | `100.00%` | `0.00%` | `1197.44 ms` |
| `regex + gemma4:e4b` | `69.91%` | `73.83%` | `71.82%` | `59.65%` | `80.36%` | `100.00%` | `37.50%` | `1532.42 ms` |

### 60-sample pause-point corpus

Reference:

- `benchmarks/local-llm-filter/results/full-benchmark-20260419-60samples.summary.md`

Environment note:

- This run was also produced in the Windows host environment so the benchmark runner, Node runtime, and Ollama service shared the same localhost context.

Headline metrics:

| Variant | Recall | Precision | F1 | Contextual Recall | Deterministic Recall | Parse Success | Negative FP Rate | Avg Latency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `regex` | `43.36%` | `72.94%` | `54.39%` | `17.57%` | `71.01%` | `100.00%` | `9.09%` | `0.00 ms` |
| `regex + qwen3.5:2b` | `55.24%` | `66.39%` | `60.31%` | `33.78%` | `78.26%` | `100.00%` | `18.18%` | `872.52 ms` |
| `regex + qwen3.5:4b` | `72.73%` | `72.73%` | `72.73%` | `58.11%` | `88.41%` | `100.00%` | `18.18%` | `1208.10 ms` |
| `regex + gemma4:e4b` | `67.13%` | `69.06%` | `68.09%` | `58.11%` | `76.81%` | `100.00%` | `54.55%` | `1556.00 ms` |

### 60-sample pure-LLM prompt-iteration run

Reference:

- `benchmarks/local-llm-filter/results/pure-llm-priors-v2-20260419.summary.md`
- `benchmarks/local-llm-filter/results/pure-qwen-fallback-priors-v2-20260419-rerun.summary.md`

Headline metrics:

| Variant | Recall | Precision | F1 | Contextual Recall | Deterministic Recall | Parse Success | Negative FP Rate | Avg Latency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pure + qwen3.5:4b` | `65.73%` | `79.66%` | `72.03%` | `58.11%` | `73.91%` | `100.00%` | `18.18%` | `1117.83 ms` |
| `pure + qwen3.5:4b + priors` | `60.84%` | `80.56%` | `69.32%` | `52.70%` | `69.57%` | `100.00%` | `0.00%` | `1060.22 ms` |
| `pure + qwen3.5:4b + priors-v2` | `78.32%` | `91.06%` | `84.21%` | `75.68%` | `81.16%` | `100.00%` | `0.00%` | `1121.97 ms` |
| `pure + qwen3.5:2b + priors-v2` | `57.34%` | `78.85%` | `66.40%` | `56.76%` | `57.97%` | `100.00%` | `0.00%` | `715.90 ms` |

Prompt-iteration takeaway:

- The first prior-only prompt proved that common priors can eliminate negative-sample false positives, but it also over-suppressed real internal endpoints and work-account identifiers.
- The second iteration (`priors-v2`) added stricter span rules, label-boundary guidance, and contrastive examples. On the same 60-sample corpus it outperformed the current `regex + qwen3.5:4b` hybrid reference on overall recall, precision, F1, contextual recall, and negative-sample false-positive behavior.
- The main remaining hybrid advantage is deterministic recall: `regex + qwen3.5:4b` still reaches `88.41%` versus `81.16%` for `pure + qwen3.5:4b + priors-v2`.
- The later `2b` rerun also exposed a benchmark harness bug: the runner was only accepting `anchor_text`, while the shipped resolver already supports `anchor_text` or `text`. After aligning the runner with the product contract, `pure + qwen3.5:2b + priors-v2` recovered to a valid, but clearly weaker, fallback profile instead of the earlier all-zero false negative result.

## Current Conclusion

- Default deep-filter strategy: `pure + qwen3.5:4b + priors-v2`
- Product architecture decision:
  - Deep filtering should be LLM-led by default.
  - The broad `regex + LLM` merge should not be the default deep-filter path.
  - Regex remains valuable, but it should move to quick preview, deterministic fallback, and future selective validation instead of broad result merging.
- Model recommendation:
  - Strong current default: `qwen3.5:4b`
  - `qwen3.5:2b` can remain as a lower-cost fallback candidate under `priors-v2`, but it is materially weaker than `4b` on recall, contextual coverage, deterministic coverage, and replacement quality.
  - `gemma4:e4b` remains a useful comparison target, but on the current corpus it trails the leading Qwen path and is more fragile on negative samples.
- Product implication:
  - The app should keep the current regex fast path as a separate quick preview.
  - The app should migrate deep filtering toward pure LLM extraction with guardrailed prompting.
  - If production validation later shows that a few deterministic classes still need insurance, the next step should be selective validator-style regex checks, not a return to broad regex-first merging.
  - On the current 60-sample corpus, the largest remaining misses are `NAME`, `ORG_NAME`, and `SENSITIVE_VALUE` label-shaping problems rather than classic regex-friendly formats. That means the next optimization step should favor prompt and post-processing refinement before adding any new validator regex layer.

## What This Does Not Mean

- It does not mean the app should only support Qwen.
- It does not mean benchmark results are final.
- It does not mean provider selection should disappear from the UI.
- It does not mean regex disappears from the product immediately.

The corpus is still only `60` samples, while the longer-term Sprint 1 target remains `140`. The current conclusion is therefore a documented product-direction decision and default recommendation, not a forever-locked model verdict.
