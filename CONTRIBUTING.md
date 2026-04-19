# Contributing

Thanks for helping improve Privacy Filter.

## Ways to contribute

- report bugs
- propose UX or filtering improvements
- improve benchmark coverage
- improve documentation
- submit code changes

## Before you start

- check existing issues and pull requests first
- keep changes focused; unrelated cleanup should be split into separate work
- add or update tests when behavior changes
- update documentation when user-facing behavior changes

## Local development

### Prerequisites

- Node.js 18+
- Rust toolchain
- Tauri platform dependencies
- Ollama if you are working on deep filtering or benchmark changes

### Setup

```bash
npm install
```

### Useful commands

```bash
npm run dev
npm run dev:tauri
npm run build
npm run build:tauri
npm run test:deep-filter
npm run bench:local-llm-filter
```

```bash
cargo test --lib --manifest-path src-tauri/Cargo.toml
```

## Pull request expectations

- describe the user-facing change and why it matters
- mention any benchmark or manual-validation evidence when filtering behavior changes
- keep commits readable and scoped
- include screenshots or screen recordings for meaningful UI changes when practical

## Benchmark changes

If you change the local-LLM prompt, provider behavior, post-processing rules, or the benchmark corpus:

- rerun the relevant benchmark variants
- update the benchmark summary or evaluation docs if the recommendation changes
- call out precision, recall, and negative false-positive impact in the PR description

## Security and privacy

- do not include real secrets or personal data in test fixtures
- prefer synthetic benchmark data
- use placeholders for tokens, credentials, and addresses unless the sample is intentionally testing placeholder handling

## Code style

- prefer small, reviewable patches
- keep UI copy clear and user-facing
- preserve local-only behavior; avoid accidental network upload paths

## Questions

For security-sensitive topics, follow [SECURITY.md](SECURITY.md) instead of opening a public issue with exploit details.
