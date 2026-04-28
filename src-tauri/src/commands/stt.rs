use crate::stt;
use base64::Engine;

#[tauri::command]
pub async fn transcribe_audio(pcm_base64: String, api_key: String) -> Result<String, String> {
    log::info!("[STT] transcribe_audio called, pcm_base64_len={}, api_key_len={}",
        pcm_base64.len(), api_key.len());

    let pcm_data = base64::engine::general_purpose::STANDARD
        .decode(&pcm_base64)
        .map_err(|e| format!("音频数据解码失败：{}", e))?;

    log::info!("[STT] decoded pcm_data_len={}", pcm_data.len());
    stt::transcribe_audio(pcm_data, &api_key).await
}
