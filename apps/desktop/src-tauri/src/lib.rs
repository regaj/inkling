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

/// Vertical center of the toolbar's content, in logical points from the window
/// top. Must match `.toolbar { height }` in `theme/styles.css` (content is
/// vertically centered in that band, and the band starts at the window top).
#[cfg(target_os = "macos")]
const TOOLBAR_CENTER_Y: f64 = 23.0;

/// Distance from the window's top edge to the vertical center of the traffic
/// lights, in logical points. `None` if the buttons aren't available.
#[cfg(target_os = "macos")]
fn traffic_light_center(window: &tauri::WebviewWindow) -> Option<f64> {
    use cocoa::appkit::{NSView, NSWindow, NSWindowButton};
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSRect;
    use objc::{msg_send, sel, sel_impl};

    let ns_window = window.ns_window().ok()? as id;
    unsafe {
        let close = ns_window.standardWindowButton_(NSWindowButton::NSWindowCloseButton);
        if close == nil {
            return None;
        }
        // Convert the button's own bounds into the window's base coordinates.
        let bounds: NSRect = NSView::bounds(close);
        let in_window: NSRect = msg_send![close, convertRect: bounds toView: nil];
        let window_height = NSWindow::frame(ns_window).size.height;
        // AppKit's origin is bottom-left; flip to a distance from the top.
        Some(window_height - (in_window.origin.y + in_window.size.height / 2.0))
    }
}

/// Center the macOS traffic lights on `target` (points from the window top).
///
/// The window-vibrancy view resets the buttons, so the `trafficLightPosition`
/// config never sticks; decorum repositions them for real. Rather than hard-code
/// an inset (which drifts with button metrics and macOS versions), apply a
/// nominal one, measure where the buttons actually landed, and solve for the
/// exact value — decorum's inset moves the center at a steady half-point per
/// point, so a single correction converges.
#[cfg(target_os = "macos")]
const TRAFFIC_LIGHT_X: f32 = 16.0;

#[cfg(target_os = "macos")]
fn align_traffic_lights(window: &tauri::WebviewWindow, target: f64) -> f32 {
    use tauri_plugin_decorum::WebviewWindowExt;

    let probe = 24.0_f64;
    let _ = window.set_traffic_lights_inset(TRAFFIC_LIGHT_X, probe as f32);
    let Some(measured) = traffic_light_center(window) else {
        return probe as f32;
    };
    // d(center)/d(inset) = 0.5 → inset += 2 * error.
    let mut inset = probe + 2.0 * (target - measured);
    for _ in 0..2 {
        let _ = window.set_traffic_lights_inset(TRAFFIC_LIGHT_X, inset as f32);
        match traffic_light_center(window) {
            Some(c) if (c - target).abs() > 0.5 => inset += 2.0 * (target - c),
            _ => break,
        }
    }
    inset as f32
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
                    let inset = align_traffic_lights(&window, TOOLBAR_CENTER_Y);
                    // Resizing / fullscreen makes AppKit re-lay-out the titlebar,
                    // which drops the buttons back to their default spot — put
                    // them back each time.
                    let w = window.clone();
                    window.on_window_event(move |event| {
                        if matches!(
                            event,
                            tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Focused(true)
                        ) {
                            use tauri_plugin_decorum::WebviewWindowExt;
                            let _ = w.set_traffic_lights_inset(TRAFFIC_LIGHT_X, inset);
                        }
                    });
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
