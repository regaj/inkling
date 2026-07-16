//! Inkling desktop backend.
//!
//! Thin Tauri v2 host: applies platform window effects (macOS vibrancy /
//! Windows Mica-Acrylic, no-op on Linux), persists window geometry, and exposes
//! a few file-IO commands so the frontend can read/write user-chosen paths
//! obtained from native dialogs.

use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::Manager;

/// Read a UTF-8 text file (an `.ink` document).
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {path}: {e}"))
}

/// Write a UTF-8 text file (`.ink`, `.svg`, `.excalidraw`).
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("Failed to write {path}: {e}"))
}

/// Write a binary file from base64 (`.png`, `.jpg`, `.pdf`).
#[tauri::command]
fn write_binary_file(path: String, base64_data: String) -> Result<(), String> {
    let bytes = STANDARD
        .decode(base64_data.as_bytes())
        .map_err(|e| format!("Invalid base64 payload: {e}"))?;
    std::fs::write(&path, bytes).map_err(|e| format!("Failed to write {path}: {e}"))
}

/// Apply the best available translucent material for the current platform.
/// Any failure is non-fatal — the app simply renders on its opaque fallback.
#[allow(unused_variables)]
fn apply_window_effects(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};
        let _ = apply_vibrancy(
            window,
            NSVisualEffectMaterial::UnderWindowBackground,
            Some(NSVisualEffectState::Active),
            Some(12.0),
        );
    }

    #[cfg(target_os = "windows")]
    {
        use window_vibrancy::{apply_acrylic, apply_mica};
        // Prefer Mica (Win 11); fall back to Acrylic (Win 10).
        if apply_mica(window, None).is_err() {
            let _ = apply_acrylic(window, Some((24, 24, 31, 180)));
        }
    }

    // Linux: no native equivalent — the frontend paints an opaque fallback.
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                apply_window_effects(&window);
                // Inset the macOS traffic lights so they sit centered in our
                // custom toolbar (VSCode-style overlay). Runs after vibrancy,
                // which otherwise resets the native button layout. decorum keeps
                // them positioned across resize / fullscreen toggles.
                #[cfg(target_os = "macos")]
                {
                    use tauri_plugin_decorum::WebviewWindowExt;
                    let _ = window.set_traffic_lights_inset(16.0, 16.0);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            write_binary_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Inkling");
}
