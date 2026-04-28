import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AlibabaSTTClient } from "../lib/stt";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
}

async function getSttApiKey(): Promise<string> {
  // 1. Try localStorage first (fastest)
  const local = localStorage.getItem("aliyun_stt_key");
  if (local) return local;

  // 2. Try Rust config (authoritative)
  try {
    const config = await invoke<{ aliyun_stt_key?: string }>("read_config");
    const key = config?.aliyun_stt_key || "";
    if (key) {
      localStorage.setItem("aliyun_stt_key", key);
      return key;
    }
  } catch {
    // Tauri not available
  }

  return "";
}

export function useVoiceInput({ onTranscript, onError }: UseVoiceInputOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const clientRef = useRef<AlibabaSTTClient | null>(null);

  const startRecording = useCallback(async () => {
    const apiKey = await getSttApiKey();

    if (!apiKey) {
      onError("请先在设置中配置阿里云 DashScope API Key");
      return;
    }

    const client = new AlibabaSTTClient(apiKey, {
      onResult: (result) => {
        if (result.text) {
          setInterimText(result.text);
        }
      },
      onError: (err) => {
        console.error("STT error:", err);
      },
    });

    clientRef.current = client;
    setInterimText("");
    setIsRecording(true);

    try {
      await client.start();
    } catch (e) {
      setIsRecording(false);
      clientRef.current = null;
      onError(`录音启动失败：${String(e)}`);
    }
  }, [onError]);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);

    const client = clientRef.current;
    if (!client) return;
    clientRef.current = null;

    try {
      const pcmBase64 = await client.stop();

      if (!pcmBase64) {
        onError("没有录制到声音，再试一次？");
        return;
      }

      const apiKey = await getSttApiKey();
      const transcription = await invoke<string>("transcribe_audio", {
        pcmBase64,
        apiKey,
      });

      const text = transcription.trim();
      if (text) {
        setInterimText(text);
        onTranscript(text);
      } else {
        onError("没有听清，再试一次？");
      }
    } catch (e) {
      const errMsg = String(e);
      onError(errMsg.includes("401") || errMsg.includes("403")
        ? "API Key 验证失败，请检查设置"
        : errMsg);
    }
  }, [onTranscript, onError]);

  return {
    isRecording,
    interimText,
    startRecording,
    stopRecording,
  };
}
