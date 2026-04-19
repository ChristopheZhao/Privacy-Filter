use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, Runtime};

const EXTRACTION_PROMPT_MARKDOWN: &str =
    include_str!("../../benchmarks/local-llm-filter/prompts/extraction-prompt-priors-v4.md");
const FALLBACK_SYSTEM_PROMPT: &str = "You are a local privacy extraction model. Extract only spans that should be redacted from the user input. Return JSON only. Never rewrite the full text. Prefer exact anchor_text copied from the original input. Use the most privacy-specific label available.";
const FALLBACK_USER_TEMPLATE: &str =
    "Analyze the following text for sensitive or private content and return JSON only.\n\nText:\n```text\n{{INPUT_TEXT}}\n```";
const ALLOWED_LABELS: &[&str] = &[
    "NAME",
    "ADDRESS",
    "PHONE_NUMBER",
    "EMAIL",
    "ID_CARD",
    "PASSPORT_NUMBER",
    "BANK_CARD",
    "WECHAT_ID",
    "QQ_NUMBER",
    "API_KEY",
    "PUBLIC_KEY",
    "SENSITIVE_VALUE",
    "DATABASE_URL",
    "DATABASE_CONFIG",
    "IP_ADDRESS",
    "PORT",
    "API_ENDPOINT",
    "CONFIG_VALUE",
    "ORG_NAME",
    "ACCOUNT_IDENTIFIER",
];

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default)]
struct AppConfig {
    custom_rules: serde_json::Value,
    active_rules: serde_json::Value,
    llm: LlmConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            custom_rules: serde_json::json!([]),
            active_rules: serde_json::json!({}),
            llm: LlmConfig::default(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default)]
struct LlmConfig {
    enabled: bool,
    provider: String,
    base_url: String,
    model: String,
    timeout_ms: u64,
    think: bool,
    auto_run: bool,
    max_chunk_chars: usize,
    confidence_threshold: f64,
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            provider: "ollama".to_string(),
            base_url: "http://127.0.0.1:11434".to_string(),
            model: "qwen3.5:4b".to_string(),
            timeout_ms: 60_000,
            think: false,
            auto_run: false,
            max_chunk_chars: 1_800,
            confidence_threshold: 0.0,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
struct LlmCommandConfig {
    enabled: Option<bool>,
    provider: Option<String>,
    base_url: Option<String>,
    model: Option<String>,
    timeout_ms: Option<u64>,
    think: Option<bool>,
    auto_run: Option<bool>,
    max_chunk_chars: Option<usize>,
    confidence_threshold: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct ModelFinding {
    label: String,
    #[serde(default)]
    anchor_text: Option<String>,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    replacement: Option<String>,
    #[serde(default)]
    confidence: Option<f64>,
    #[serde(default)]
    reason: Option<String>,
    #[serde(default)]
    context_before: Option<String>,
    #[serde(default)]
    context_after: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
struct ResolvedFinding {
    label: String,
    start: usize,
    end: usize,
    text: String,
    replacement: String,
    confidence: f64,
    reason: String,
    #[serde(skip_serializing)]
    byte_start: usize,
    #[serde(skip_serializing)]
    byte_end: usize,
}

#[derive(Serialize, Debug, Clone)]
struct UnresolvedFinding {
    label: String,
    anchor_text: String,
    reason: String,
    confidence: f64,
}

#[derive(Serialize, Debug, Clone)]
struct AnalyzeTextResult {
    provider: String,
    model: String,
    elapsed_ms: u64,
    raw_findings: Vec<ModelFinding>,
    findings: Vec<ResolvedFinding>,
    applied_findings: Vec<ResolvedFinding>,
    unresolved_findings: Vec<UnresolvedFinding>,
    redacted_text: String,
}

#[derive(Serialize, Debug, Clone)]
struct LlmHealthcheckResult {
    ok: bool,
    provider: String,
    base_url: String,
    model: String,
    elapsed_ms: u64,
    message: String,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    message: OllamaMessage,
}

#[derive(Deserialize)]
struct OllamaMessage {
    #[serde(default)]
    content: String,
}

#[derive(Deserialize)]
struct ModelFindingsEnvelope {
    findings: Vec<ModelFinding>,
}

#[derive(Clone, Copy)]
enum LocalLlmProvider {
    Ollama,
}

impl LocalLlmProvider {
    fn provider_name(self) -> &'static str {
        match self {
            Self::Ollama => "ollama",
        }
    }
}

fn get_config_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    let path = app_handle
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path.join("config.json")
}

fn load_config_from_disk<R: Runtime>(app_handle: &AppHandle<R>) -> Result<AppConfig, String> {
    let path = get_config_path(app_handle);
    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn merged_llm_config(base: LlmConfig, override_config: Option<LlmCommandConfig>) -> LlmConfig {
    let Some(override_config) = override_config else {
        return base;
    };

    LlmConfig {
        enabled: override_config.enabled.unwrap_or(base.enabled),
        provider: override_config.provider.unwrap_or(base.provider),
        base_url: override_config.base_url.unwrap_or(base.base_url),
        model: override_config.model.unwrap_or(base.model),
        timeout_ms: override_config.timeout_ms.unwrap_or(base.timeout_ms),
        think: override_config.think.unwrap_or(base.think),
        auto_run: override_config.auto_run.unwrap_or(base.auto_run),
        max_chunk_chars: override_config
            .max_chunk_chars
            .unwrap_or(base.max_chunk_chars),
        confidence_threshold: override_config
            .confidence_threshold
            .unwrap_or(base.confidence_threshold),
    }
}

fn build_ollama_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "required": ["findings"],
        "properties": {
            "findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["label"],
                    "properties": {
                        "label": { "type": "string" },
                        "anchor_text": { "type": "string" },
                        "text": { "type": "string" },
                        "replacement": { "type": "string" },
                        "confidence": { "type": "number" },
                        "reason": { "type": "string" },
                        "context_before": { "type": "string" },
                        "context_after": { "type": "string" }
                    },
                    "additionalProperties": true
                }
            }
        },
        "additionalProperties": false
    })
}

fn parse_prompt_sections(content: &'static str) -> Option<(&'static str, &'static str)> {
    let system_marker = "## System";
    let user_marker = "## User Template";

    let system_start = content.find(system_marker)?;
    let user_start = content.find(user_marker)?;

    if user_start <= system_start {
        return None;
    }

    let system = content[system_start + system_marker.len()..user_start].trim();
    let user = content[user_start + user_marker.len()..].trim();

    if system.is_empty() || user.is_empty() {
        return None;
    }

    Some((system, user))
}

fn extraction_prompt_sections() -> (&'static str, &'static str) {
    parse_prompt_sections(EXTRACTION_PROMPT_MARKDOWN)
        .unwrap_or((FALLBACK_SYSTEM_PROMPT, FALLBACK_USER_TEMPLATE))
}

fn extraction_system_prompt() -> &'static str {
    extraction_prompt_sections().0
}

fn extraction_user_prompt(input: &str) -> String {
    extraction_prompt_sections()
        .1
        .replace("{{INPUT_TEXT}}", input)
}

fn parse_json_content(content: &str) -> Result<ModelFindingsEnvelope, String> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Ok(ModelFindingsEnvelope { findings: vec![] });
    }

    let normalized = if trimmed.starts_with("```") {
        trimmed
            .trim_start_matches("```json")
            .trim_start_matches("```JSON")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
            .to_string()
    } else {
        trimmed.to_string()
    };

    serde_json::from_str(&normalized).map_err(|e| format!("Failed to parse LLM JSON: {e}"))
}

fn collect_occurrences(text: &str, needle: &str) -> Vec<usize> {
    if needle.is_empty() {
        return vec![];
    }

    let mut hits = Vec::new();
    let mut search_start = 0;
    while let Some(next) = text[search_start..].find(needle) {
        let actual_start = search_start + next;
        hits.push(actual_start);
        search_start = actual_start + needle.len().max(1);
    }

    hits
}

fn utf16_index_from_byte(text: &str, byte_index: usize) -> usize {
    text[..byte_index].encode_utf16().count()
}

fn score_occurrence(text: &str, start: usize, finding: &ModelFinding, anchor_text: &str) -> i32 {
    let mut score = 0;

    if let Some(context_before) = finding
        .context_before
        .as_ref()
        .filter(|value| !value.is_empty())
    {
        let before_start = start.saturating_sub(context_before.len() + 32);
        let before_window = &text[before_start..start];
        if before_window.ends_with(context_before) {
            score += 3;
        } else if before_window.contains(context_before) {
            score += 1;
        }
    }

    if let Some(context_after) = finding
        .context_after
        .as_ref()
        .filter(|value| !value.is_empty())
    {
        let end = start + anchor_text.len();
        let after_end = (end + context_after.len() + 32).min(text.len());
        let after_window = &text[end..after_end];
        if after_window.starts_with(context_after) {
            score += 3;
        } else if after_window.contains(context_after) {
            score += 1;
        }
    }

    score
}

fn resolve_model_findings(
    text: &str,
    findings: &[ModelFinding],
    confidence_threshold: f64,
) -> (Vec<ResolvedFinding>, Vec<UnresolvedFinding>) {
    let mut resolved = Vec::new();
    let mut unresolved = Vec::new();

    for finding in findings {
        let label = finding.label.trim().to_string();
        let anchor_text = finding
            .anchor_text
            .as_deref()
            .or(finding.text.as_deref())
            .unwrap_or("")
            .trim()
            .to_string();
        let confidence = finding.confidence.unwrap_or(0.0);

        if label.is_empty() || anchor_text.is_empty() {
            unresolved.push(UnresolvedFinding {
                label,
                anchor_text,
                reason: "invalid_finding_shape".to_string(),
                confidence,
            });
            continue;
        }

        if confidence_threshold > 0.0 && confidence > 0.0 && confidence < confidence_threshold {
            unresolved.push(UnresolvedFinding {
                label,
                anchor_text,
                reason: "below_confidence_threshold".to_string(),
                confidence,
            });
            continue;
        }

        let candidates = collect_occurrences(text, &anchor_text);
        if candidates.is_empty() {
            unresolved.push(UnresolvedFinding {
                label,
                anchor_text,
                reason: "anchor_not_found".to_string(),
                confidence,
            });
            continue;
        }

        let byte_start = if candidates.len() == 1 {
            candidates[0]
        } else {
            let mut ranked = candidates
                .iter()
                .map(|candidate_start| {
                    (
                        *candidate_start,
                        score_occurrence(text, *candidate_start, finding, &anchor_text),
                    )
                })
                .collect::<Vec<_>>();
            ranked.sort_by(|left, right| right.1.cmp(&left.1));

            if ranked.len() > 1 && ranked[0].1 == ranked[1].1 {
                unresolved.push(UnresolvedFinding {
                    label,
                    anchor_text,
                    reason: "ambiguous_anchor".to_string(),
                    confidence,
                });
                continue;
            }

            if ranked[0].1 <= 0 {
                unresolved.push(UnresolvedFinding {
                    label,
                    anchor_text,
                    reason: "ambiguous_anchor".to_string(),
                    confidence,
                });
                continue;
            }

            ranked[0].0
        };
        let byte_end = byte_start + anchor_text.len();

        resolved.push(ResolvedFinding {
            label,
            start: utf16_index_from_byte(text, byte_start),
            end: utf16_index_from_byte(text, byte_end),
            text: anchor_text,
            replacement: finding
                .replacement
                .clone()
                .unwrap_or_else(|| format!("[{}]", finding.label)),
            confidence,
            reason: finding.reason.clone().unwrap_or_default(),
            byte_start,
            byte_end,
        });
    }

    resolved.sort_by(|left, right| {
        left.byte_start
            .cmp(&right.byte_start)
            .then_with(|| right.byte_end.cmp(&left.byte_end))
            .then_with(|| {
                right
                    .confidence
                    .partial_cmp(&left.confidence)
                    .unwrap_or(Ordering::Equal)
            })
    });
    resolved.dedup_by(|left, right| {
        left.label == right.label
            && left.byte_start == right.byte_start
            && left.byte_end == right.byte_end
            && left.text == right.text
    });

    (resolved, unresolved)
}

fn finding_is_nested_within(parent: &ResolvedFinding, child: &ResolvedFinding) -> bool {
    parent.byte_start <= child.byte_start && child.byte_end <= parent.byte_end
}

fn post_process_resolved_findings(findings: Vec<ResolvedFinding>) -> Vec<ResolvedFinding> {
    let database_urls = findings
        .iter()
        .filter(|finding| finding.label == "DATABASE_URL")
        .cloned()
        .collect::<Vec<_>>();

    findings
        .into_iter()
        .filter(|finding| ALLOWED_LABELS.contains(&finding.label.as_str()))
        .filter(|finding| {
            if !matches!(
                finding.label.as_str(),
                "IP_ADDRESS" | "PORT" | "SENSITIVE_VALUE"
            ) {
                return true;
            }

            !database_urls.iter().any(|database_url| {
                finding.label != "DATABASE_URL"
                    && database_url.text != finding.text
                    && finding_is_nested_within(database_url, finding)
            })
        })
        .collect()
}

fn select_applied_findings(findings: &[ResolvedFinding]) -> Vec<ResolvedFinding> {
    let mut applied = Vec::new();

    for finding in findings {
        let overlaps = applied.iter().any(|existing: &ResolvedFinding| {
            finding.byte_start < existing.byte_end && existing.byte_start < finding.byte_end
        });
        if !overlaps {
            applied.push(finding.clone());
        }
    }

    applied
}

fn apply_redactions(text: &str, findings: &[ResolvedFinding]) -> String {
    let mut redacted = text.to_string();
    let mut spans = findings.to_vec();
    spans.sort_by(|left, right| right.byte_start.cmp(&left.byte_start));

    for finding in spans {
        redacted.replace_range(finding.byte_start..finding.byte_end, &finding.replacement);
    }

    redacted
}

async fn send_ollama_request(
    config: &LlmConfig,
    input: &str,
) -> Result<(Vec<ModelFinding>, u64), String> {
    let client = Client::builder()
        .timeout(Duration::from_millis(config.timeout_ms))
        .build()
        .map_err(|e| e.to_string())?;
    let started_at = Instant::now();
    let url = format!("{}/api/chat", config.base_url.trim_end_matches('/'));

    let response = client
        .post(url)
        .json(&serde_json::json!({
            "model": config.model,
            "stream": false,
            "think": config.think,
            "format": build_ollama_schema(),
            "messages": [
                {
                    "role": "system",
                    "content": extraction_system_prompt(),
                },
                {
                    "role": "user",
                    "content": extraction_user_prompt(input),
                }
            ],
            "options": {
                "temperature": 0
            }
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let response = response.error_for_status().map_err(|e| e.to_string())?;
    let payload: OllamaChatResponse = response.json().await.map_err(|e| e.to_string())?;
    let parsed = parse_json_content(&payload.message.content)?;

    Ok((parsed.findings, started_at.elapsed().as_millis() as u64))
}

fn supported_provider(config: &LlmConfig) -> Result<LocalLlmProvider, String> {
    match config.provider.trim().to_lowercase().as_str() {
        "ollama" => Ok(LocalLlmProvider::Ollama),
        other => Err(format!(
            "Unsupported provider: {other}. The app is designed for multiple providers, but only `ollama` is implemented right now."
        )),
    }
}

async fn provider_healthcheck(config: &LlmConfig) -> Result<LlmHealthcheckResult, String> {
    let provider = supported_provider(config)?;

    match provider.provider_name() {
        "ollama" => {
            let client = Client::builder()
                .timeout(Duration::from_millis(config.timeout_ms.min(5_000)))
                .build()
                .map_err(|e| e.to_string())?;
            let started_at = Instant::now();
            let url = format!("{}/api/tags", config.base_url.trim_end_matches('/'));

            let response = client.get(url).send().await.map_err(|e| e.to_string())?;
            let ok = response.status().is_success();
            let message = if ok {
                "Provider reachable".to_string()
            } else {
                format!("Provider returned HTTP {}", response.status())
            };

            Ok(LlmHealthcheckResult {
                ok,
                provider: provider.provider_name().to_string(),
                base_url: config.base_url.clone(),
                model: config.model.clone(),
                elapsed_ms: started_at.elapsed().as_millis() as u64,
                message,
            })
        }
        _ => Err("Unsupported provider dispatch".to_string()),
    }
}

async fn provider_analyze_text(
    config: &LlmConfig,
    input: &str,
) -> Result<(Vec<ModelFinding>, u64), String> {
    let provider = supported_provider(config)?;

    match provider.provider_name() {
        "ollama" => send_ollama_request(config, input).await,
        _ => Err("Unsupported provider dispatch".to_string()),
    }
}

#[tauri::command]
fn save_config<R: Runtime>(app_handle: AppHandle<R>, config: AppConfig) -> Result<(), String> {
    let path = get_config_path(&app_handle);
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_config<R: Runtime>(app_handle: AppHandle<R>) -> Result<AppConfig, String> {
    load_config_from_disk(&app_handle)
}

#[tauri::command]
async fn llm_healthcheck<R: Runtime>(
    app_handle: AppHandle<R>,
    runtime: Option<LlmCommandConfig>,
) -> Result<LlmHealthcheckResult, String> {
    let config = merged_llm_config(load_config_from_disk(&app_handle)?.llm, runtime);
    provider_healthcheck(&config).await
}

#[tauri::command]
async fn analyze_text<R: Runtime>(
    app_handle: AppHandle<R>,
    input: String,
    runtime: Option<LlmCommandConfig>,
) -> Result<AnalyzeTextResult, String> {
    if input.trim().is_empty() {
        return Ok(AnalyzeTextResult {
            provider: "ollama".to_string(),
            model: String::new(),
            elapsed_ms: 0,
            raw_findings: vec![],
            findings: vec![],
            applied_findings: vec![],
            unresolved_findings: vec![],
            redacted_text: String::new(),
        });
    }

    let config = merged_llm_config(load_config_from_disk(&app_handle)?.llm, runtime);
    let (raw_findings, elapsed_ms) = provider_analyze_text(&config, &input).await?;
    let (resolved_findings, unresolved_findings) =
        resolve_model_findings(&input, &raw_findings, config.confidence_threshold);
    let findings = post_process_resolved_findings(resolved_findings);
    let applied_findings = select_applied_findings(&findings);
    let redacted_text = apply_redactions(&input, &applied_findings);

    Ok(AnalyzeTextResult {
        provider: config.provider,
        model: config.model,
        elapsed_ms,
        raw_findings,
        findings,
        applied_findings,
        unresolved_findings,
        redacted_text,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            save_config,
            load_config,
            llm_healthcheck,
            analyze_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{
        apply_redactions, extraction_prompt_sections, extraction_user_prompt, parse_json_content,
        post_process_resolved_findings, resolve_model_findings, supported_provider, LlmConfig,
        ModelFinding, ResolvedFinding,
    };

    #[test]
    fn benchmark_prompt_sections_are_available() {
        let (system, user_template) = extraction_prompt_sections();

        assert!(system.contains("local privacy redaction extractor"));
        assert!(user_template.contains("{{INPUT_TEXT}}"));
        assert!(user_template.contains("return JSON only"));
    }

    #[test]
    fn extraction_user_prompt_injects_input_text() {
        let prompt = extraction_user_prompt("联系人：张三");

        assert!(prompt.contains("联系人：张三"));
        assert!(!prompt.contains("{{INPUT_TEXT}}"));
    }

    #[test]
    fn confidence_threshold_zero_keeps_zero_confidence_findings() {
        let findings = vec![ModelFinding {
            label: "NAME".to_string(),
            anchor_text: Some("张三".to_string()),
            text: None,
            replacement: Some("[NAME]".to_string()),
            confidence: Some(0.0),
            reason: Some("真实姓名".to_string()),
            context_before: None,
            context_after: None,
        }];

        let (resolved, unresolved) = resolve_model_findings("联系人：张三", &findings, 0.0);

        assert_eq!(resolved.len(), 1);
        assert!(unresolved.is_empty());
        assert_eq!(resolved[0].text, "张三");
    }

    #[test]
    fn positive_confidence_threshold_only_filters_positive_confidence_findings() {
        let findings = vec![
            ModelFinding {
                label: "NAME".to_string(),
                anchor_text: Some("张三".to_string()),
                text: None,
                replacement: Some("[NAME]".to_string()),
                confidence: Some(0.0),
                reason: Some("真实姓名".to_string()),
                context_before: None,
                context_after: None,
            },
            ModelFinding {
                label: "EMAIL".to_string(),
                anchor_text: Some("ops@example.com".to_string()),
                text: None,
                replacement: Some("[EMAIL]".to_string()),
                confidence: Some(0.3),
                reason: Some("邮箱".to_string()),
                context_before: None,
                context_after: None,
            },
        ];

        let (resolved, unresolved) =
            resolve_model_findings("联系人：张三，邮箱：ops@example.com", &findings, 0.5);

        assert_eq!(resolved.len(), 1);
        assert_eq!(resolved[0].label, "NAME");
        assert_eq!(unresolved.len(), 1);
        assert_eq!(unresolved[0].reason, "below_confidence_threshold");
    }

    #[test]
    fn parse_json_content_accepts_fenced_json() {
        let parsed = parse_json_content(
            "```json\n{\"findings\":[{\"label\":\"NAME\",\"anchor_text\":\"林朔\"}]}\n```",
        )
        .expect("fenced JSON should parse");

        assert_eq!(parsed.findings.len(), 1);
        assert_eq!(parsed.findings[0].label, "NAME");
        assert_eq!(
            parsed.findings[0].anchor_text.as_deref(),
            Some("林朔")
        );
    }

    #[test]
    fn unsupported_provider_returns_clear_error() {
        let result = supported_provider(&LlmConfig {
            provider: "mock-provider".to_string(),
            ..LlmConfig::default()
        });

        let error = match result {
            Ok(_) => panic!("unsupported provider should error"),
            Err(error) => error,
        };

        assert!(error.contains("Unsupported provider"));
        assert!(error.contains("mock-provider"));
    }

    #[test]
    fn resolved_findings_use_utf16_offsets_for_frontend_preview() {
        let findings = vec![
            ModelFinding {
                label: "NAME".to_string(),
                anchor_text: Some("林朔".to_string()),
                text: None,
                replacement: Some("[NAME]".to_string()),
                confidence: Some(0.0),
                reason: Some("真实姓名".to_string()),
                context_before: None,
                context_after: None,
            },
            ModelFinding {
                label: "API_ENDPOINT".to_string(),
                anchor_text: Some("http://10.90.4.8:8088/hook".to_string()),
                text: None,
                replacement: Some("[API_ENDPOINT]".to_string()),
                confidence: Some(0.0),
                reason: Some("内部回调地址".to_string()),
                context_before: None,
                context_after: None,
            },
        ];
        let input = "群里结论是由京东云企业服务部的林朔继续跟，先把回调切到http://10.90.4.8:8088/hook。";

        let (resolved, unresolved) = resolve_model_findings(input, &findings, 0.0);

        assert!(unresolved.is_empty());
        assert_eq!(resolved[0].text, "林朔");
        assert_eq!(&input[resolved[0].byte_start..resolved[0].byte_end], "林朔");
        assert_eq!(resolved[0].start, "群里结论是由京东云企业服务部的".encode_utf16().count());

        let redacted = apply_redactions(input, &resolved);
        assert_eq!(
            redacted,
            "群里结论是由京东云企业服务部的[NAME]继续跟，先把回调切到[API_ENDPOINT]。"
        );
    }

    #[test]
    fn post_processing_drops_nested_database_url_components_and_unknown_labels() {
        let findings = vec![
            ResolvedFinding {
                label: "DATABASE_URL".to_string(),
                start: 0,
                end: 38,
                text: "redis://:cachepass@10.0.5.12:6379/0".to_string(),
                replacement: "[DATABASE_URL]".to_string(),
                confidence: 0.0,
                reason: String::new(),
                byte_start: 0,
                byte_end: 38,
            },
            ResolvedFinding {
                label: "IP_ADDRESS".to_string(),
                start: 19,
                end: 28,
                text: "10.0.5.12".to_string(),
                replacement: "[IP_ADDRESS]".to_string(),
                confidence: 0.0,
                reason: String::new(),
                byte_start: 19,
                byte_end: 28,
            },
            ResolvedFinding {
                label: "PORT".to_string(),
                start: 29,
                end: 33,
                text: "6379".to_string(),
                replacement: "[PORT]".to_string(),
                confidence: 0.0,
                reason: String::new(),
                byte_start: 29,
                byte_end: 33,
            },
            ResolvedFinding {
                label: "ISSUE_ID".to_string(),
                start: 40,
                end: 48,
                text: "APP-1024".to_string(),
                replacement: "[ISSUE_ID]".to_string(),
                confidence: 0.0,
                reason: String::new(),
                byte_start: 40,
                byte_end: 48,
            },
        ];

        let processed = post_process_resolved_findings(findings);

        assert_eq!(processed.len(), 1);
        assert_eq!(processed[0].label, "DATABASE_URL");
    }
}
