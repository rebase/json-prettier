#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use serde_json;
use serde_json::ser::{PrettyFormatter, Serializer};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![format_json_string])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
