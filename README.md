# Privacy Filter

Privacy Filter is a desktop application for removing sensitive information from text while preserving readable context. It is designed for prompt sanitization, log sharing, issue reports, and document cleanup, with all filtering performed locally.

## Highlights

- Local-only filtering pipeline
- Fast built-in regex preview for high-confidence patterns
- Deep filtering powered by a local LLM
- Review-and-apply workflow for individual deep-filter findings
- Tauri desktop app with React UI and Rust backend
- Benchmark assets for evaluating local-model choices

## Current Local LLM Direction

The project is intentionally designed to support multiple local providers over time. The current first working provider is `ollama`, but the app configuration keeps `provider`, `base_url`, `model`, timeout, and threshold settings configurable.

Current benchmark-backed recommendation on the `60`-sample starter corpus:

- Default deep-filter strategy: `pure + qwen3.5:4b + priors-v4 + post-processing`
- Recommended default model: `qwen3.5:4b`
- Lower-cost fallback candidate: `qwen3.5:2b`
- Regex remains available for quick preview and fallback, but it is no longer the preferred deep-filter direction

Reference material:

- [Local LLM Evaluation](docs/local-llm-evaluation.md)
- [Benchmark README](benchmarks/local-llm-filter/README.md)
- [Documentation Index](docs/README.md)

## Installation

### End users

The recommended path is to download a packaged release from GitHub Releases when one is available.

### Developers

#### Prerequisites

- Node.js 18+
- Rust toolchain
- Tauri build dependencies for your platform
- A local LLM runtime if you want to use deep filtering, currently `ollama`

For WSL or Linux desktop development, you also need the usual Tauri GUI dependencies, including GTK/WebKit-related packages.

#### Install dependencies

```bash
npm install
```

#### Start the web app

```bash
npm run dev
```

#### Start the desktop app

```bash
npm run dev:tauri
```

#### Build the app

```bash
npm run build
npm run build:tauri
```

#### Run tests

```bash
npm run test:deep-filter
```

```bash
cargo test --lib --manifest-path src-tauri/Cargo.toml
```

#### Run the local LLM benchmark

```bash
npm run bench:local-llm-filter
```

## Local LLM Setup

Typical local setup with Ollama:

```bash
ollama pull qwen3.5:4b
ollama serve
```

Default local endpoint:

```text
http://127.0.0.1:11434
```

The app persists local-LLM settings through Tauri commands such as `load_config`, `save_config`, `llm_healthcheck`, and `analyze_text`.

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
