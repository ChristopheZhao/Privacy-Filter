# Roadmap

This roadmap is here to show where the project is heading. It is not a release calendar, and it should not be read as a promise about exact dates.

## Product Direction

Privacy Filter is being built as a local-first privacy layer for modern AI workflows.

The motivation is straightforward:

- people increasingly send work text to online LLMs
- that text often contains privacy-sensitive or security-sensitive information
- a trustworthy local filtering step should exist before that text leaves the machine

## What We Are Working On Now

- stabilize the local desktop experience on Tauri
- keep regex preview fast and deterministic
- improve deep filtering with local LLMs
- maintain a benchmark-backed model selection path
- keep review-and-apply UX understandable for non-expert users

## Near-Term Roadmap

### 1. Deep filter quality and reliability

- keep improving prompt and post-processing quality for names, organizations, addresses, and mixed-language text
- improve failure messaging when the local runtime is unavailable
- continue expanding benchmark coverage before future model changes

### 2. File filtering support

This is one of the next obvious product steps, not a vague maybe-for-later idea.

Target support should expand from plain text input to local file content such as:

- `.txt`
- `.md`
- `.json`
- `.yaml` / `.yml`
- `.log`
- `.csv`

Initial goals for file filtering:

- load a file locally
- run rule preview or deep filter against file content
- show a reviewable diff before overwrite or export
- save a sanitized copy instead of silently mutating the source file

### 3. Better environment guidance

- make Windows and WSL local-runtime setup clearer
- provide better diagnostics when Ollama is reachable in one environment but not the other
- keep first-run setup simple for non-expert users

## Mid-Term Roadmap

### 4. Rich document support

After plain-text files are stable, expand toward richer local document handling:

- PDF text extraction and filtering
- Word document text filtering
- spreadsheet-oriented content sanitization
- batch processing for folders of exported logs or reports

This should stay local-first and reviewable. In most cases, the safer path is to export a sanitized copy rather than silently rewriting the original file in place.

### 5. More local runtime choices

- keep `ollama` as the current default path
- preserve provider-based configuration in the app
- evaluate support for additional local runtimes when they materially improve deployment or model choice

## Longer-Term Direction

- stronger review UX for large texts and file diffs
- selective validator-style deterministic checks around LLM output
- better workflows for support teams, developers, and internal documentation sharing

## Out of Scope for Now

- cloud-hosted filtering as the default path
- silent automatic rewriting without review
- replacing every deterministic rule with a model call
- promising exact release dates for roadmap items before the implementation risk is reduced
