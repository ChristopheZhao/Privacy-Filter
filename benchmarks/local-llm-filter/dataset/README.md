# Dataset Guide

## Purpose

This dataset measures both deterministic redaction quality and contextual privacy detection quality.
It is intentionally mixed so the evaluation does not overfit to regex-friendly samples.

## Target Mix

- `30` deterministic structured samples
- `40` contextual Chinese privacy samples
- `30` code, config, and log samples
- `20` clean negative samples
- `20` mixed noisy long-form samples

The seed file in this repo is only a starter set. Expand it until the target mix is reached before making a default-model decision.
The current repo starter set contains `60` labeled samples.

## File Format

The benchmark corpus lives in `samples.jsonl`.
Each line is one JSON object.
The checked-in JSONL uses UTF-8 directly so Chinese and mixed-language samples remain human-readable in the repo.

Required fields:

- `id`
- `language`
- `domain`
- `category`
- `text`
- `expected_spans`

Optional fields:

- `notes`
- `tags`

## Annotation Rules

- Ground truth uses exact `start` and `end` offsets in the original `text`.
- `start` is inclusive; `end` is exclusive.
- `required=true` means a miss counts as a false negative.
- Prefer the most privacy-specific label when multiple labels are plausible.
- Overlapping spans are allowed only when they are nested and both are useful for local replacement.
- Negative samples must use `expected_spans: []`.
- If a sample is ambiguous, explain the ambiguity in `notes` instead of silently changing labels later.

## Label Guidance

Core labels currently used in Sprint 1:

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

## Expansion Rules

When adding more samples:

- Keep at least `70%` Simplified Chinese content.
- Keep some mixed Chinese-English technical samples.
- Add clean negatives every time you add new positive classes.
- Include long-form noisy samples before final model selection, not only short snippets.
- Add decoy negatives with ports, version numbers, demo accounts, and other values that should not be redacted, so false positives stay visible in the benchmark.
