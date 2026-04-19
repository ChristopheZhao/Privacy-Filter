# Plan: Local LLM Filtering Evaluation and Integration
- Plan ID: PLAN-20260418-LOCAL-LLM-FILTER
- Type: feature
- Status: in_progress
- Priority: P0
- Owner: Codex
- Created At: 2026-04-18T14:15:40Z

## 1. Requirement Analysis
- User intent:
  Replace the current regex-led filtering strategy with a local-LLM-led workflow, keep regex only where it adds clear product value, and choose the default local model plus deep-filter strategy from measured evidence instead of assumptions.
- Scope in:
  Model evaluation harness; benchmark dataset and labeling rules; Ollama-backed provider abstraction in Tauri; structured redaction contract; async "deep filter" workflow in the frontend; configuration and persistence for local model settings.
- Scope out:
  Bundling model weights into the installer; cloud inference providers; model fine-tuning; removing every existing regex rule in the first release; per-keystroke LLM inference.
- Acceptance criteria:
  A reproducible benchmark compares hybrid and pure-LLM variants under the same runtime; a default model and deep-filter strategy decision is recorded from measured results; the desktop app can call a local provider and produce structured findings; the user can run deep filtering and review/apply the result in-app; verification covers benchmark correctness, contract stability, and end-to-end desktop flow.

## 2. Functional Decomposition
- Benchmark and evaluation:
  Build a local harness, sample corpus, annotation rules, and scoring pipeline for recall, precision, F1, structured-output success, latency, and memory.
- Backend inference layer:
  Add provider healthcheck, analysis commands, chunking, prompt assembly, structured-output parsing, resolver logic, and deterministic replacement execution in Rust.
- Frontend filtering UX:
  Add async deep-filter trigger, progress state, findings review list, result preview, and apply/cancel flows without blocking the current fast regex preview.
- Configuration and operations:
  Persist local provider/model settings, thresholds, chunking parameters, and failure states; document installation and model setup for contributors.

## 3. Implementation Approach
- Data flow:
  Regex quick preview remains independent for fast local hints. Deep-filter data flow becomes input text -> chunking with overlap -> single-pass LLM extraction per chunk -> local resolver -> local replacement -> review/apply UI. Any future regex safety net should be selective and validator-style rather than a broad merged prefilter.
- API/contract changes:
  Add Tauri commands for `llm_healthcheck` and `analyze_text`; extend config persistence with provider/model fields; define a JSON findings schema using `label`, `anchor_text`, `replacement`, `confidence`, `reason`, `context_before`, and `context_after`.
- Migration or compatibility notes:
  Keep current regex filtering available during transition; add LLM mode as an opt-in deep filter first; stop expanding regex coverage except for critical deterministic gaps; preserve existing saved rule config compatibility.

## 4. Technical Solution
- Key design choices:
  Use Ollama as the V1 local runtime; treat the LLM as a structured extractor instead of a free-form rewriter; compare `qwen3.5:2b`, `qwen3.5:4b`, and `gemma4:e4b` against both regex-led and pure-LLM baselines before choosing the default; run one LLM pass per chunk instead of a two-pass "judge then filter" chain.
- Trade-offs:
  Ollama lowers integration cost but adds an external dependency; a review-first UX reduces accidental corruption but is slower than direct replacement; anchor-text-based resolution is more robust than raw offsets but needs careful ambiguity handling.
- Risks and mitigations:
  False negatives on contextual privacy -> prioritize recall in benchmark gates and keep the option for selective validator-style regex checks on proven blind spots.
  False positives and text corruption -> never allow the model to rewrite the full text; replacements are executed locally.
  Latency on weaker machines -> benchmark 2B versus 4B, set chunk limits, keep auto-run disabled by default.
  Structured output instability -> enforce schema-constrained responses and treat parse failures as visible errors.
  Model choice drift -> make provider/model configurable and record the benchmark-backed default plus strategy decision in docs.

## 5. Execution List (Priority Ordered)
- [x] P0 Sprint 1: Create the benchmark harness, labeled sample set, scoring rules, and result report format.
- [x] P0 Sprint 1: Run the baseline `regex` benchmark and capture its recall/precision/F1 and latency numbers.
- [x] P0 Sprint 1: Run `regex + qwen3.5:2b`, `regex + qwen3.5:4b`, and `regex + gemma4:e4b` under the same prompt/schema/runtime conditions.
- [x] P0 Sprint 1: Record the model and strategy decision based on the 60-sample pause-point corpus; current default deep-filter path is `pure + qwen3.5:4b + priors-v2`, with regex retained for quick preview and fallback rather than broad merged redaction.
- [x] P0 Sprint 2: Add the Rust provider abstraction, Ollama healthcheck, prompt builder, structured-output parser, and local replacement engine.
- [x] P0 Sprint 2: Extend config persistence with provider/model/timeout/chunking/threshold fields while keeping existing config compatible.
- [x] P1 Sprint 3: Add the frontend deep-filter workflow, review panel, status states, and apply/cancel actions.
- [x] P1 Sprint 3: Keep the current regex fast path available as quick preview while deep filtering runs asynchronously.
- [x] P1 Sprint 3: Port the `priors-v2` prompt and pure-LLM default strategy into the shipped Tauri backend so the app behavior matches the benchmark-backed decision.
- [ ] P1 Sprint 4: Add tests, documentation, setup instructions, and troubleshooting for local model installation and provider failures.
- [x] P1 Sprint 4: Re-benchmark the lower-cost fallback path under `priors-v2`; `qwen3.5:2b` remains a valid but clearly weaker fallback than `qwen3.5:4b`.
- [ ] P1 Sprint 4: Decide whether any selective regex validator layer is still needed after production-like validation data is available.

## 6. Test and Acceptance
- Unit tests:
  Prompt/schema validation; parser and resolver behavior; replacement conflict handling; config serialization and migration behavior.
- Integration tests:
  Tauri command path with mocked Ollama responses; benchmark harness result generation; frontend state transitions for deep-filter success/failure.
- Manual verification:
  Benchmark run produces comparable reports for all four variants; local Ollama setup works with the chosen default model; a desktop user can analyze text, inspect findings, disable one finding, and apply the rest without corrupting unrelated text.

## 7. Status Log
- 2026-04-18T14:15:40Z draft created
- 2026-04-18T14:19:00Z moved to in_progress after plan approval and Sprint 1 benchmark specification started
- 2026-04-18T14:27:00Z benchmark skeleton created under `benchmarks/local-llm-filter/` with dataset guide, starter samples, schemas, prompt, and variant config
- 2026-04-18T15:08:00Z provider-based benchmark runner added, regex baseline smoke run completed in WSL, and summary/detail report generation validated
- 2026-04-18T15:16:00Z provider healthcheck added; regex baseline still passes; LLM benchmark variants are currently blocked only by missing local Ollama service at `http://127.0.0.1:11434`
- 2026-04-19T03:50:38Z first Windows-backed full benchmark completed; `gemma4:e4b` led the starter set with 84.21% recall, 75.00% contextual recall, 100.00% parse success, and 5.87s average latency, while both Qwen variants were degraded by request timeouts or schema instability under the initial provider settings
- 2026-04-19T04:02:00Z follow-up diagnosis confirmed that `qwen3.5` is exposed by Ollama as a thinking-capable model and requires explicit `think: false` in benchmark requests to reflect the intended product mode; runtime config and provider diagnostics were updated for a fair second pass
- 2026-04-19T04:09:45Z second-pass benchmark with `think: false` completed on the 10-sample starter set; `qwen3.5:4b` moved into the lead with 84.21% recall, 62.50% contextual recall, 100.00% parse success, 1.10s average latency, and zero unresolved findings, while `qwen3.5:2b` improved latency but still showed 66.67% unresolved-finding rate and `gemma4:e4b` dropped behind on both recall and contextual coverage under the same settings
- 2026-04-19T04:21:41Z starter corpus expanded to 22 samples and rerun; `qwen3.5:4b` kept the lead with 81.40% recall, 61.90% contextual recall, 100.00% parse success, 0.00% unresolved-finding rate, and 1.19s average latency, while `qwen3.5:2b` remained a plausible low-latency fallback but failed the unresolved-finding gate and `gemma4:e4b` trailed on F1 and deterministic recall
- 2026-04-19T05:05:00Z Sprint 2 backend skeleton started; `src-tauri` now has persisted `llm` config defaults, an Ollama-backed provider path, and Tauri commands for `llm_healthcheck` plus `analyze_text`, and both `cargo check` and frontend `npm run build` pass in WSL
- 2026-04-19T05:32:00Z frontend deep-filter wiring started; the React UI now distinguishes regex quick preview from “深度过滤（本地 LLM）”, exposes local LLM settings, persists LLM config alongside rules, and still passes `npm run build` with `cargo check`
- 2026-04-19T05:48:00Z per-finding review flow completed; deep filtering now returns a selectable findings list, a live selected-result preview, an unresolved findings panel, and an apply-to-input action
- 2026-04-19T06:08:00Z review UI visually refined; the main filtering surface now uses clearer card hierarchy, friendlier status summaries, and a polished settings modal while preserving provider-configurable runtime settings
- 2026-04-19T07:14:22Z benchmark corpus expanded to 33 samples with more deterministic identifiers, contextual mailing/project/admin notes, technical logs/configs, and decoy negatives; rerun confirms `qwen3.5:4b` remains the strongest default candidate with 77.33% F1, 60.53% contextual recall, 97.22% deterministic recall, and 0.00% negative-sample false-positive rate
- 2026-04-19T07:26:32Z benchmark corpus expanded again to 48 samples with more decoy negatives, technical logs, school/project/admin language, and noisy mixed records; canonical rerun was kept on the Windows host environment and still favors `qwen3.5:4b` with 76.99% F1, 63.16% contextual recall, 91.07% deterministic recall, and 0.00% negative-sample false-positive rate
- 2026-04-19T07:34:50Z benchmark corpus reached a 60-sample pause point with additional long-form mixed records and stronger placeholder-heavy negatives; canonical Windows-host rerun still favors `qwen3.5:4b` on overall F1 and deterministic/contextual recall, but the decoy set also exposed 18.18% negative-sample false-positive pressure for both Qwen variants, so benchmark expansion can pause while prompt/provider guardrails move to the front of the queue
- 2026-04-19T07:57:15Z first pure-LLM prompt-prior run completed; common priors eliminated negative-sample false positives but over-suppressed real internal endpoints and work-account identifiers, so a second iteration was required before making a product-strategy decision
- 2026-04-19T08:04:01Z second pure-LLM prompt iteration (`priors-v2`) completed on the same 60-sample corpus; `pure + qwen3.5:4b + priors-v2` reached 84.21% F1, 75.68% contextual recall, 81.16% deterministic recall, and 0.00% negative-sample false-positive rate, which is strong enough to shift the product decision toward pure-LLM deep filtering while keeping regex as quick preview and fallback
- 2026-04-19T08:42:00Z shipped backend prompt source was switched to the benchmark-backed `priors-v2` prompt, the default confidence threshold was lowered to `0` to match the benchmark contract, and both `cargo check` plus `npm run build` passed after the change
- 2026-04-19T08:50:00Z focused Rust unit tests were added for prompt parsing and confidence-threshold behavior; `cargo test --lib` now passes alongside `npm run build`
- 2026-04-19T09:44:09Z the benchmark runner was aligned with the shipped resolver contract by accepting either `anchor_text` or `text`; after rerunning `pure + qwen3.5:2b + priors-v2`, the lower-cost fallback recovered to 66.40% F1 with 0.00% negative-sample false-positive rate, which is usable but still clearly behind the 4B default
- 2026-04-19T09:52:00Z miss-pattern review on the current `pure + qwen3.5:4b + priors-v2` result showed that the largest remaining gaps are `NAME`, `ORG_NAME`, and `SENSITIVE_VALUE` label-shaping issues rather than classic regex-friendly formats, so immediate effort should bias toward prompt and post-processing refinement instead of expanding a validator regex layer
- 2026-04-19T10:38:00Z desktop verification on the real Tauri window exposed a frontend preview corruption bug even though the model findings themselves were correct; the root cause was a Rust-byte-offset to JavaScript-string-index mismatch in reviewed findings, which was fixed by serializing UTF-16-safe `start/end` values to the frontend while keeping byte offsets for Rust-side replacement, and the same mixed sample then verified cleanly in the UI with 4 hits, 0 unresolved findings, correct placeholder preservation, and a clean copied deep-filter result
- 2026-04-19T11:02:00Z targeted regression coverage was added for the shipped deep-filter path: a new frontend utility test suite now locks default selection, deselection, and Chinese preview/application behavior under `node --test`, while Rust unit tests now cover fenced-JSON parsing, unsupported-provider failure messaging, prompt parsing, confidence-threshold behavior, and UTF-16-safe preview offsets

## 8. Execution Handoff (Optional)
- Current focus:
  Add the remaining tests/documentation around the new `priors-v2` deep-filter default, then tighten prompt and post-processing around `NAME`, `ORG_NAME`, and `SENSITIVE_VALUE`.
- Blockers:
  The shipped deep-filter path still lacks broader tests for end-to-end review/apply behavior and failure handling, and the remaining accuracy gap is now concentrated in semantic labels that are not easy to rescue with regex alone.
- Next resume action:
  Add tests for the review/apply flow and failure handling, then refine prompt and post-processing for `NAME`, `ORG_NAME`, and `SENSITIVE_VALUE` before revisiting whether any selective regex validator is still necessary.
- Evidence pointers:
  `src/components/TextFilter/index.jsx`
  `src/components/TextFilter/privacyRules.js`
  `src-tauri/src/lib.rs`
  `docs/plans/PLAN_INDEX.json`
  `docs/plans/active/PLAN-20260418-local-llm-filter-benchmark-spec.md`
  `benchmarks/local-llm-filter/results/full-benchmark-20260419.summary.md`
  `benchmarks/local-llm-filter/results/full-benchmark-20260419-think-false.summary.md`
  `benchmarks/local-llm-filter/results/full-benchmark-20260419-22samples.summary.md`
- Updated at:
  2026-04-19T11:02:00Z
