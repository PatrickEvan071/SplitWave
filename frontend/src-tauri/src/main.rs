// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use std::path::Path;
use std::path::PathBuf;

#[tauri::command]
async fn run_demucs(app: AppHandle, file_path: String) -> Result<String, String> {
    let sidecar = app.shell().sidecar("demucs_runner").map_err(|e| e.to_string())?;

    let output = sidecar
        .args([&file_path])
        .output()
        .await
        .map_err(|e| format!("Failed to execute sidecar: {}", e))?;

    if output.status.success() {
        let path = Path::new(&file_path);
        let file_stem = path.file_stem().unwrap_or_default().to_string_lossy();
        
        let mut stem_dir = dirs::document_dir().unwrap_or_else(|| PathBuf::from("C:\\"));
        stem_dir.push("SplitWave");
        stem_dir.push("separated");
        stem_dir.push("htdemucs_6s");
        stem_dir.push(file_stem.to_string());

        Ok(stem_dir.to_string_lossy().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn export_master(
    app: AppHandle,
    stem_dir: String, 
    dest_path: String, 
    mix_data: String, 
    speed: f64,
    transpose: i32,
) -> Result<String, String> {
    let sidecar = app.shell().sidecar("mixer").map_err(|e| e.to_string())?;

    let output = sidecar
        .args([&stem_dir, &dest_path, &mix_data, &speed.to_string(), &transpose.to_string()])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok("Export successful".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn export_raw_stem(source_path: String, dest_path: String) -> Result<(), String> {
    std::fs::copy(source_path, dest_path)
        .map(|_| ())
        .map_err(|e| format!("Failed to export stem: {}", e))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init()) 
        .invoke_handler(tauri::generate_handler![run_demucs, export_raw_stem, export_master])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}