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

#[tauri::command]
fn export_raw_stem(source_path: String, dest_path: String) -> Result<(), String> {
    std::fs::copy(source_path, dest_path)
        .map(|_| ())
        .map_err(|e| format!("Failed to export stem: {}", e))
}

#[tauri::command]
async fn export_master(
    stem_dir: String, 
    dest_path: String, 
    mix_data: String, 
    speed: f64,
    transpose: i32,
) -> Result<String, String> {
    let python_path = "C:/Users/Patrick Evan/SplitWave/backend/venv/Scripts/python.exe";
    let script_path = "../backend/mixer.py";

    let output = std::process::Command::new(python_path)
        .arg(script_path)
        .arg(&stem_dir)
        .arg(&dest_path)
        .arg(&mix_data)
        .arg(speed.to_string())
        .arg(transpose.to_string())
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok("Export successful".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init()) 
        .invoke_handler(tauri::generate_handler![run_demucs, export_raw_stem, export_master])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}