use crate::store::json_store;
use crate::store::schema::AppConfig;

#[tauri::command]
pub fn read_config() -> AppConfig {
    let config = json_store::read_config().unwrap_or_default();
    log::info!("read_config: aliyun_stt_key={}",
        config.aliyun_stt_key.as_deref().unwrap_or("none"));
    config
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    log::info!("save_config: aliyun_stt_key={}",
        config.aliyun_stt_key.as_deref().unwrap_or("none"));
    json_store::save_config(&config).map_err(|e| {
        log::error!("save_config failed: {}", e);
        e.to_string()
    })
}
