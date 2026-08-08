#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::Path; // Add this import at the top of the file

#[tauri::command]
async fn run_demucs(file_path: String) -> Result<String, String> {
    println!("Starting Demucs for: {}", file_path);

    let python_path = "C:/Users/Patrick Evan/SplitWave/backend/venv/Scripts/python.exe";
    let script_path = "C:/Users/Patrick Evan/SplitWave/backend/demucs_runner.py";

    let output = std::process::Command::new(python_path)
        .arg(script_path) 
        .arg(&file_path)
        .output()
        .map_err(|e| format!("Failed to execute Python script: {}", e))?;

    if output.status.success() {
        // Parse the filename (e.g., "Song.mp3" -> "Song")
        let path = Path::new(&file_path);
        let file_stem = path.file_stem().unwrap_or_default().to_string_lossy();
        
        // Inside main.rs
        let stem_dir = format!("C:/Users/Patrick Evan/SplitWave/backend/separated/htdemucs_6s/{}", file_stem);
        
        Ok(stem_dir)
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