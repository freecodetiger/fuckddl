use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use tokio::net::TcpStream;
use tokio_tungstenite::{
    connect_async,
    tungstenite::{
        client::IntoClientRequest,
        http::HeaderValue,
        Message,
    },
    MaybeTlsStream, WebSocketStream,
};

/// DashScope FunASR realtime WebSocket endpoint
const DASHSCOPE_WS_URL: &str = "wss://dashscope.aliyuncs.com/api-ws/v1/inference/";

type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

async fn connect_ws(api_key: &str) -> Result<WsStream, String> {
    // Mask API key for logging
    let masked_key = if api_key.len() > 8 {
        format!("{}...{}", &api_key[..4], &api_key[api_key.len()-4..])
    } else {
        "***".to_string()
    };
    log::info!("[STT] connecting to {} with key={}", DASHSCOPE_WS_URL, masked_key);

    // Build a tungstenite request directly (not via http::Request)
    // to ensure Sec-WebSocket-Key is properly generated
    let mut req = DASHSCOPE_WS_URL
        .into_client_request()
        .map_err(|e| format!("构建请求失败：{}", e))?;

    req.headers_mut().insert(
        "Authorization",
        HeaderValue::from_str(&format!("Bearer {}", api_key))
            .map_err(|e| format!("无效的 API Key: {}", e))?,
    );

    match connect_async(req).await {
        Ok((ws, resp)) => {
            log::info!("[STT] connected, HTTP status: {}", resp.status());
            Ok(ws)
        }
        Err(e) => {
            let err_str = e.to_string();
            log::error!("[STT] connect failed: {}", err_str);

            // Classify the error to help debugging
            let hint = if err_str.contains("certificate") || err_str.contains("Cert") || err_str.contains("TLS") || err_str.contains("ssl") || err_str.contains("Ssl") {
                " (TLS 证书问题)"
            } else if err_str.contains("dns") || err_str.contains("resolve") || err_str.contains("Name") {
                " (DNS 解析失败)"
            } else if err_str.contains("connect") || err_str.contains("Connection") || err_str.contains("timeout") {
                " (TCP 连接失败或超时)"
            } else if err_str.contains("401") || err_str.contains("403") {
                " (API Key 无效)"
            } else if err_str.contains("404") {
                " (端点不存在)"
            } else if err_str.contains("503") || err_str.contains("502") {
                " (服务暂时不可用)"
            } else {
                ""
            };

            Err(format!("DashScope WebSocket 连接失败：{}{}", err_str, hint))
        }
    }
}

pub async fn transcribe_audio(pcm_data: Vec<u8>, api_key: &str) -> Result<String, String> {
    if api_key.is_empty() {
        return Err("请先配置阿里云 DashScope API Key".to_string());
    }

    if pcm_data.is_empty() {
        return Err("音频数据为空".to_string());
    }

    let mut ws = connect_ws(api_key).await?;

    let task_id = uuid::Uuid::new_v4().to_string();

    // Step 1: Send run-task config
    let run_task = json!({
        "header": {
            "action": "run-task",
            "task_id": task_id,
            "streaming": "duplex"
        },
        "payload": {
            "task_group": "audio",
            "task": "asr",
            "function": "recognition",
            "model": "fun-asr-realtime-2025-09-15",
            "parameters": {
                "format": "pcm",
                "sample_rate": 16000
            },
            "input": {}
        }
    });

    ws.send(Message::Text(run_task.to_string().into()))
        .await
        .map_err(|e| format!("发送配置消息失败：{}", e))?;

    // Step 2: Wait for task-started before sending audio
    let mut started = false;
    while let Some(msg) = ws.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                    let event = json["header"]["event"].as_str().unwrap_or("");
                    match event {
                        "task-started" => {
                            started = true;
                            break;
                        }
                        "task-failed" => {
                            let err_msg = json["header"]["error_message"]
                                .as_str()
                                .unwrap_or("未知错误");
                            return Err(format!("语音服务启动失败：{}", err_msg));
                        }
                        _ => {}
                    }
                }
            }
            Ok(Message::Close(_)) => {
                return Err("WebSocket 连接在启动任务时被关闭".to_string());
            }
            Err(e) => {
                return Err(format!("WebSocket 错误：{}", e));
            }
            _ => {}
        }
    }

    if !started {
        return Err("语音服务未返回 task-started 确认".to_string());
    }

    // Step 3: Send audio data in chunks
    let chunk_size = 4096;
    for chunk in pcm_data.chunks(chunk_size) {
        ws.send(Message::Binary(chunk.to_vec().into()))
            .await
            .map_err(|e| format!("发送音频数据失败：{}", e))?;
        // Small delay to simulate real-time streaming
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    // Step 4: Send finish-task signal
    let finish_task = json!({
        "header": {
            "action": "finish-task",
            "task_id": task_id,
            "streaming": "duplex"
        },
        "payload": {
            "input": {}
        }
    });

    ws.send(Message::Text(finish_task.to_string().into()))
        .await
        .map_err(|e| format!("发送结束消息失败：{}", e))?;

    // Step 5: Collect transcription results
    // result-generated: payload.output.sentence.text has the recognized text
    // task-finished: indicates completion
    let mut final_text = String::new();
    let mut last_text = String::new();

    while let Some(msg) = ws.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                    let event = json["header"]["event"].as_str().unwrap_or("");
                    match event {
                        "result-generated" => {
                            let t = json["payload"]["output"]["sentence"]["text"]
                                .as_str()
                                .unwrap_or("");
                            let sentence_end = json["payload"]["output"]["sentence"]["sentence_end"]
                                .as_bool()
                                .unwrap_or(false);

                            if sentence_end && !t.is_empty() {
                                final_text.push_str(t);
                            } else if !t.is_empty() {
                                last_text = t.to_string();
                            }
                        }
                        "task-finished" => {
                            break;
                        }
                        "task-failed" => {
                            let err_msg = json["header"]["error_message"]
                                .as_str()
                                .unwrap_or("未知错误");
                            return Err(format!("语音识别失败：{}", err_msg));
                        }
                        _ => {}
                    }
                }
            }
            Ok(Message::Close(_)) => break,
            Err(e) => {
                return Err(format!("WebSocket 错误：{}", e));
            }
            _ => {}
        }
    }

    let _ = ws.close(None).await;

    // Prefer final text, fall back to last interim text
    let result = if final_text.is_empty() {
        last_text
    } else {
        final_text
    };

    if result.is_empty() {
        return Err("未识别到语音内容".to_string());
    }

    Ok(result)
}
