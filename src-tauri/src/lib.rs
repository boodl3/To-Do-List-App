mod storage;
mod timer;

use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(timer::Scheduler::new(Arc::new(timer::wall_clock_ms)))
        .invoke_handler(tauri::generate_handler![
            storage::load_document,
            storage::save_document,
            timer::schedule_timer_completion,
            timer::cancel_timer_completion
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
