# Privacy Filter

[English](README.md) | [简体中文](README.zh-CN.md)

Privacy Filter is a desktop application for removing sensitive information from text while preserving readable context. It is designed for prompt sanitization, log sharing, issue reports, and document cleanup, with all filtering performed locally.

## Why This Project Exists

Online LLM tools are useful, but the text people send to them often contains private or internal information such as names, contact details, credentials, logs, and support context. Privacy Filter exists to add a local sanitization step before that text leaves the machine.

The project combines:

- rule-based filtering for high-confidence structured secrets
- local-LLM filtering for contextual privacy detection
- a review step before the cleaned text is copied or shared

## Filtering Modes

Privacy Filter provides two filtering modes.

### 1. Rule mode

Suitable for structured, high-confidence patterns such as:

- email addresses
- phone numbers
- database URLs
- API keys and obvious credentials

Properties:

- no Ollama required
- no local model required
- CPU-only is fine
- best for quick masking and fallback behavior

In the current UI, this section is labeled `规则快速预览`.

### 2. Deep filter mode

Suitable for contextual detection of items such as:

- names in natural language
- addresses
- organization names
- work-account identifiers
- mixed code, config, and prose samples where regex alone is too brittle

Properties:

- requires a local LLM runtime
- currently defaults to `ollama + qwen3.5:4b`
- returns reviewable findings instead of silently rewriting the whole text
- works best when a dedicated GPU is available

## Highlights

- Local-only filtering pipeline
- Fast built-in rule-based filtering for high-confidence patterns
- Deep filtering powered by a local LLM
- Provider-based local runtime configuration for future model/runtime expansion
- Review-and-apply workflow for individual deep-filter findings
- Tauri desktop app with React UI and Rust backend
- Benchmark assets for evaluating local-model choices

## Default Local LLM Setup

Reference benchmark snapshot on the `60`-sample starter corpus:

| Variant | Recall | Precision | F1 | Negative FP Rate | Avg Latency |
| --- | --- | --- | --- | --- | --- |
| `regex + qwen3.5:4b` | `72.73%` | `72.73%` | `72.73%` | `18.18%` | `1208.10 ms` |
| `regex + gemma4:e4b` | `67.13%` | `69.06%` | `68.09%` | `54.55%` | `1556.00 ms` |
| `pure + qwen3.5:2b + priors-v2` | `57.34%` | `78.85%` | `66.40%` | `0.00%` | `715.90 ms` |
| `pure + qwen3.5:4b + priors-v4 + post-processing` | `93.84%` | `99.28%` | `96.48%` | `0.00%` | `1483.13 ms` |

Application defaults:

- provider: `ollama`
- model: `qwen3.5:4b`
- deep-filter implementation: `pure + qwen3.5:4b + priors-v4 + post-processing`
- lower-cost fallback to try first: `qwen3.5:2b`

To change the provider or model:

1. Open `规则设置`
2. Go to the `本地 LLM` tab
3. Change `provider`, `base_url`, or `model`
4. If you switch to a new Ollama model, pull it first with `ollama pull <model>`
5. Run deep filter again

The prompt contract and post-processing used by the current default strategy are built into the app. In normal usage, configuration changes are limited to the provider, endpoint, and model.

Reference material:

- [Local LLM Evaluation](docs/local-llm-evaluation.md)
- [Benchmark README](benchmarks/local-llm-filter/README.md)
- [Documentation Index](docs/README.md)
- [Roadmap](ROADMAP.md)

## Installation

### End users

If a packaged release is available, that is the simplest way to use the app.

### Developers

#### Common requirements

- Node.js 18+
- Rust toolchain
- Tauri build dependencies for your platform

For WSL or Linux desktop development, you also need the usual Tauri GUI dependencies, including GTK/WebKit-related packages.

#### Common setup

```bash
npm install
```

#### Rule mode only

This path uses the built-in rule set only. No local LLM runtime is required.

```bash
npm run dev:tauri
```

#### Deep filter mode

This path requires a local LLM runtime. The current default is `ollama + qwen3.5:4b`.

1. Install Ollama
2. Pull the recommended model and start the local runtime:

```bash
ollama pull qwen3.5:4b
ollama serve
```

3. Start the app:

```bash
npm run dev:tauri
```

4. In the app, open `规则设置` -> `本地 LLM`, then confirm:

- `provider = ollama`
- `model = qwen3.5:4b`
- `base_url = http://127.0.0.1:11434`

#### Common commands

Start the web app:

```bash
npm run dev
```

Start the desktop app:

```bash
npm run dev:tauri
```

Build the app:

```bash
npm run build
npm run build:tauri
```

Run tests:

```bash
npm run test:deep-filter
```

```bash
cargo test --lib --manifest-path src-tauri/Cargo.toml
```

Run the local LLM benchmark:

```bash
npm run bench:local-llm-filter
```

## Deep Filter Runtime Notes

### Hardware guidance

These recommendations are based on the current default model, the benchmark results in this repository, and Ollama's published model sizes. They are project guidance, not official minimum requirements from the model or runtime vendors.

For rule mode:

- recommended: any modern CPU
- recommended memory: `8 GB RAM` or more
- GPU: not required

For deep filter with `qwen3.5:4b`:

- recommended: a dedicated GPU is preferred
- recommended GPU: `8 GB VRAM` or more
- recommended system memory: `16 GB RAM` or more
- workable fallback: CPU-only with `16 GB RAM`, but expect noticeably slower latency

For the lighter `qwen3.5:2b` fallback:

- recommended GPU: `4 GB to 6 GB VRAM`
- recommended system memory: `8 GB to 16 GB RAM`
- use this only when `4b` is too slow or does not fit well

For storage:

- Ollama's Windows docs note that the install itself needs additional disk space and that model storage can grow from tens to hundreds of GB depending on what you pull
- the current Ollama `qwen3.5:4b` tag is listed at about `3.4 GB`

In short:

- prefer GPU when available
- prefer `qwen3.5:4b` as the default quality/performance balance
- fall back to `qwen3.5:2b` only for lower-end local machines

### Windows and WSL note

`127.0.0.1` only works when the app and Ollama are running in the same environment.

Common cases:

- Windows app + Ollama on Windows: `http://127.0.0.1:11434` usually works
- WSL app + Ollama in WSL: `http://127.0.0.1:11434` usually works
- WSL app + Ollama on Windows: `127.0.0.1` may fail because WSL localhost is not the Windows host localhost

If deep filter shows an error like:

```text
error sending request for url (http://127.0.0.1:11434/api/tags)
```

work through these in order:

1. Is Ollama actually running?
2. Did `ollama pull qwen3.5:4b` finish successfully?
3. Is the app running in Windows or in WSL?
4. Does `base_url` point to the same environment where Ollama is running?

## Project Structure

```text
privacy-filter/
|- benchmarks/   # Local LLM benchmark assets and reports
|- docs/         # User-facing docs, evaluation notes, and plans
|- scripts/      # Helper scripts
|- src/          # React UI
|- src-tauri/    # Tauri + Rust backend
|- package.json
`- vite.config.js
```

## Troubleshooting

### PowerShell blocks `npm`

If Windows PowerShell reports that `npm.ps1` cannot be loaded because script execution is disabled, update the current-user execution policy and open a new PowerShell session:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### WSL desktop startup issues

If `npm run dev:tauri` starts the frontend but the desktop app fails to launch in WSL, verify that your GUI stack and Tauri runtime dependencies are installed and that your local display environment is working.

### Deep filter cannot reach Ollama

If rule preview works but deep filter fails, the most common cause is that the app cannot reach the Ollama API endpoint.

Quick checks:

- open `http://127.0.0.1:11434/api/tags` from the same environment where the app is running
- confirm the selected `base_url` matches that environment
- confirm `ollama serve` is still running
- confirm the target model appears in `ollama list`

## Language Support

The built-in rule set and starter benchmark corpus currently focus on Chinese-first scenarios. If you need support for additional regions or languages, you can:

- add custom rules in the UI
- extend the rule set in `src/components/TextFilter/privacyRules.js`
- contribute new benchmark samples for your target language or domain

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, testing expectations, and pull-request guidance.

## Security

Please do not report security issues through public issues when exploitation details or sensitive data are involved. See [SECURITY.md](SECURITY.md) for the reporting process.

## Changelog

Project history is tracked in [CHANGELOG.md](CHANGELOG.md).

## License

This project is released under the [MIT License](LICENSE).
