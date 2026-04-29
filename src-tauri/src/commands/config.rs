use std::fs;
use std::path::PathBuf;

fn env_path() -> PathBuf {
    dirs::data_dir()
        .expect("Failed to find app data directory")
        .join("fuckddl")
        .join(".env")
}

#[tauri::command]
pub fn read_config() -> serde_json::Value {
    serde_json::json!({
        "codex_api_url": std::env::var("CODEX_API_URL").unwrap_or_default(),
        "codex_api_key": std::env::var("CODEX_API_KEY").unwrap_or_default(),
        "aliyun_stt_key": std::env::var("ALIYUN_STT_KEY").unwrap_or_default(),
        "github_repo": std::env::var("GITHUB_REPO").unwrap_or_default(),
        "github_token": std::env::var("GITHUB_TOKEN").unwrap_or_default(),
        "github_branch": std::env::var("GITHUB_BRANCH").unwrap_or_default(),
    })
}

#[tauri::command]
pub fn save_config(config: serde_json::Value) -> Result<(), String> {
    let path = env_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let map = config.as_object().ok_or("Invalid config")?;
    let mut lines = vec!["# fuckddl config — auto-generated".to_string()];
    lines.push("# Edit with care or use the app settings".to_string());

    let keys = ["codex_api_url", "codex_api_key", "aliyun_stt_key", "github_repo", "github_token", "github_branch"];
    let env_names = ["CODEX_API_URL", "CODEX_API_KEY", "ALIYUN_STT_KEY", "GITHUB_REPO", "GITHUB_TOKEN", "GITHUB_BRANCH"];

    for (i, key) in keys.iter().enumerate() {
        if let Some(val) = map.get(*key).and_then(|v| v.as_str()) {
            if !val.is_empty() {
                lines.push(format!("{}={}", env_names[i], val));
                std::env::set_var(env_names[i], val);
            }
        }
    }

    fs::write(&path, lines.join("\n") + "\n").map_err(|e| e.to_string())?;
    log::info!("config saved to {:?}", path);
    Ok(())
}
