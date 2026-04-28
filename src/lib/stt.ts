/**
 * Alibaba Cloud DashScope FunASR Realtime STT (fun-asr-realtime-2025-09-15).
 *
 * Architecture:
 * - Frontend captures PCM audio at 16kHz via AudioContext + ScriptProcessor
 * - Accumulates all audio data during recording
 * - Sends complete buffer to Rust backend, which handles the
 *   authenticated WebSocket connection to DashScope
 *
 * This avoids the browser WebSocket limitation where custom
 * headers (Authorization: Bearer) cannot be set.
 */

const SAMPLE_RATE = 16000; // fun-asr-realtime-2025-09-15 requires 16kHz

export interface STTResult {
  text: string;
  isFinal: boolean;
  beginTime: number;
  endTime: number;
}

interface STTCallbacks {
  onResult: (result: STTResult) => void;
  onError: (error: string) => void;
}

export class AlibabaSTTClient {
  private apiKey: string;
  private callbacks: STTCallbacks;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private pcmChunks: Float32Array[] = [];
  private isRunning = false;

  constructor(apiKey: string, callbacks: STTCallbacks) {
    this.apiKey = apiKey;
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    if (!this.apiKey) {
      this.callbacks.onError("请先配置阿里云 DashScope API Key");
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // ScriptProcessorNode gives us raw PCM data
      // 4096 samples at 16kHz = 256ms per frame
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.pcmChunks = [];

      this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isRunning) return;
        const input = e.inputBuffer.getChannelData(0);
        // Clone the data since it's reused by the browser
        this.pcmChunks.push(new Float32Array(input));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isRunning = true;
    } catch (e) {
      this.callbacks.onError(`无法启动录音：${String(e)}`);
      this.cleanup();
    }
  }

  async stop(): Promise<string> {
    this.isRunning = false;

    // Disconnect audio processing
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // Clean up media
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Convert accumulated PCM to a single Int16Array
    const totalLength = this.pcmChunks.reduce((sum, c) => sum + c.length, 0);
    const int16Data = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        int16Data[offset + i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      offset += chunk.length;
    }
    this.pcmChunks = [];

    if (totalLength === 0) {
      this.callbacks.onError("没有录制到声音");
      return "";
    }

    // Convert to base64 for Tauri IPC
    const uint8 = new Uint8Array(int16Data.buffer);
    const base64 = this.arrayBufferToBase64(uint8);

    return base64;
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  private cleanup(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.pcmChunks = [];
  }
}
