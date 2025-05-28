#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serde_json::{
    self,
    ser::{PrettyFormatter, Serializer},
};
use tauri_plugin_store::StoreExt;

#[derive(Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub indent_type: String,
    pub indent_width: usize,
    pub theme: String,
    pub font_size: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            indent_type: "space".to_string(),
            indent_width: 4,
            theme: "".to_string(),
            font_size: 14,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct AppData {
    pub last_json_input: String,
    pub settings: AppSettings,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            last_json_input: String::new(),
            settings: AppSettings::default(),
        }
    }
}

#[tauri::command]
fn format_json_string(
    json_string: String,
    indent_type: String,
    indent_width: usize,
) -> Result<String, String> {
    let parsed_value: serde_json::Value =
        serde_json::from_str(&json_string).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut buf = Vec::new();
    let indent_char = if indent_type == "tab" { b'\t' } else { b' ' };
    let indent = if indent_type == "tab" {
        vec![indent_char; 1]
    } else {
        vec![indent_char; indent_width]
    };

    let formatter = PrettyFormatter::with_indent(&indent);
    let mut ser = Serializer::with_formatter(&mut buf, formatter);
    parsed_value
        .serialize(&mut ser)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    Ok(String::from_utf8(buf).map_err(|e| format!("Failed to convert to UTF-8: {}", e))?)
}

#[tauri::command]
async fn save_app_data(app: tauri::AppHandle, data: AppData) -> Result<(), String> {
    let store = app
        .store_builder("app_data.json")
        .build()
        .map_err(|e| e.to_string())?;

    store.set(
        "app_data",
        serde_json::to_value(data).map_err(|e| e.to_string())?,
    );

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_app_data(app: tauri::AppHandle) -> Result<AppData, String> {
    let store = app
        .store_builder("app_data.json")
        .build()
        .map_err(|e| e.to_string())?;

    match store.get("app_data") {
        Some(value) => serde_json::from_value(value.clone()).map_err(|e| e.to_string()),
        None => Ok(AppData::default()),
    }
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

#[tauri::command]
async fn reset_app_data(app: tauri::AppHandle) -> Result<(), String> {
    let store = app
        .store_builder("app_data.json")
        .build()
        .map_err(|e| e.to_string())?;

    let default_data = AppData::default();
    store.set(
        "app_data",
        serde_json::to_value(&default_data).map_err(|e| e.to_string())?,
    );

    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            format_json_string,
            save_app_data,
            load_app_data,
            read_file,
            write_file,
            reset_app_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
