#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;

#[tauri::command]
async fn run_demucs(file_path: String) -> Result<String, String> {
    println!("Starting Demucs for: {}", file_path);

    // 1. Absolute path to your virtual environment's Python
    let python_path = "C:/Users/Patrick Evan/SplitWave/backend/venv/Scripts/python.exe";
    
    // 2. Absolute path to your Python script
    let script_path = "C:/Users/Patrick Evan/SplitWave/backend/demucs_runner.py";

    let output = Command::new(python_path)
        .arg(script_path) 
        .arg(&file_path)
        .output()
        .map_err(|e| format!("Failed to execute Python script: {}", e))?;

    if output.status.success() {
        Ok("Processing complete!".to_string())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(err.to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init()) 
        .invoke_handler(tauri::generate_handler![run_demucs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}