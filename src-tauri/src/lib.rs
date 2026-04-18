use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};

#[derive(Serialize, Deserialize, Debug, Clone)]
struct AppConfig {
    custom_rules: serde_json::Value,
    active_rules: serde_json::Value,
}

// 获取配置文件路径
fn get_config_path<R: Runtime>(app_handle: &AppHandle<R>) -> PathBuf {
    // Tauri v2 API: app_handle.path().app_config_dir()
    let path = app_handle.path().app_config_dir().unwrap_or_else(|_| PathBuf::from("."));
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path.join("config.json")
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
    let path = get_config_path(&app_handle);
    if !path.exists() {
        return Ok(AppConfig {
            custom_rules: serde_json::json!([]),
            active_rules: serde_json::json!({}),
        });
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config: AppConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![save_config, load_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
