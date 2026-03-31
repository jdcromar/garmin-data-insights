use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct ApiProcess(Mutex<Child>);

// CARGO_MANIFEST_DIR is desktop/src-tauri at compile time.
// Two levels up is the project root where api/ and src/ live.
const PROJECT_ROOT: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../..");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let project_root = std::fs::canonicalize(PROJECT_ROOT)
                .expect("Could not resolve project root");

            let child = Command::new("python")
                .args(["-m", "uvicorn", "api.main:app", "--port", "8765", "--log-level", "warning"])
                .current_dir(&project_root)
                .spawn()
                .expect("Failed to start API server. Is Python installed?");

            app.manage(ApiProcess(Mutex::new(child)));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(api) = window.app_handle().try_state::<ApiProcess>() {
                    let _ = api.0.lock().unwrap().kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
