#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json;

#[tauri::command]
fn format_json_string(json_string: String) -> Result<String, String> {
    let parsed_value: serde_json::Value =
        serde_json::from_str(&json_string).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let formatted_json = serde_json::to_string_pretty(&parsed_value)
        .map_err(|e| format!("Failed to format JSON: {}", e))?;

    Ok(formatted_json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![format_json_string])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
