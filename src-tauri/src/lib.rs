mod commands;
mod git;
mod store;
mod stt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            crate::store::json_store::ensure_dirs().ok();
            // Load .env file from app data directory
            let env_path = dirs::data_dir()
                .expect("no data dir")
                .join("fuckddl")
                .join(".env");
            if env_path.exists() {
                dotenv::from_path(&env_path).ok();
                log::info!("Loaded env from {:?}", env_path);
            }
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::config::read_config,
            commands::config::save_config,
            commands::stt::transcribe_audio,
            commands::schedule::get_recent_events,
            commands::schedule::get_today_schedules,
            commands::schedule::get_schedules_by_date,
            commands::schedule::create_schedule,
            commands::schedule::update_schedule,
            commands::schedule::delete_schedule,
            commands::git_sync::sync_status,
            commands::git_sync::sync_now,
            commands::reminder::schedule_reminder,
            commands::reminder::cancel_reminder,
            commands::todo::get_todos,
            commands::todo::create_todo,
            commands::todo::update_todo,
            commands::todo::delete_todo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
