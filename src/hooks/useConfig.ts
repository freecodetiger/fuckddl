import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface AppConfig {
  github_token?: string;
  github_repo?: string;
  github_branch?: string;
  codex_api_url?: string;
  codex_api_key?: string;
  aliyun_stt_key?: string;
}

interface ConfigState {
  config: AppConfig;
  loaded: boolean;
  load: () => Promise<void>;
  save: (partial: Partial<AppConfig>) => Promise<void>;
}

export const useConfig = create<ConfigState>((set, get) => ({
  config: {},
  loaded: false,

  load: async () => {
    try {
      const config = await invoke<AppConfig>("read_config");
      console.log("[useConfig] loaded from Rust:", {
        has_aliyun_stt_key: !!config.aliyun_stt_key,
      });
      // Also sync to localStorage for quick access in llm.ts etc.
      if (config.codex_api_url)
        localStorage.setItem("codex_api_url", config.codex_api_url);
      if (config.codex_api_key)
        localStorage.setItem("codex_api_key", config.codex_api_key);
      if (config.aliyun_stt_key)
        localStorage.setItem("aliyun_stt_key", config.aliyun_stt_key);
      if (config.github_repo)
        localStorage.setItem("github_repo", config.github_repo);
      if (config.github_token)
        localStorage.setItem("github_token", config.github_token);
      set({ config, loaded: true });
    } catch (e) {
      console.warn("[useConfig] Rust read_config failed, using localStorage:", e);
      // Not running in Tauri (dev in browser), use localStorage
      const config: AppConfig = {
        codex_api_url: localStorage.getItem("codex_api_url") || undefined,
        codex_api_key: localStorage.getItem("codex_api_key") || undefined,
        aliyun_stt_key: localStorage.getItem("aliyun_stt_key") || undefined,
        github_repo: localStorage.getItem("github_repo") || undefined,
        github_token: localStorage.getItem("github_token") || undefined,
      };
      console.log("[useConfig] loaded from localStorage:", {
        has_aliyun_stt_key: !!config.aliyun_stt_key,
      });
      set({ config, loaded: true });
    }
  },

  save: async (partial) => {
    const current = get().config;
    const updated = { ...current, ...partial };
    // Persist to localStorage immediately
    if (partial.codex_api_url !== undefined)
      localStorage.setItem("codex_api_url", partial.codex_api_url);
    if (partial.codex_api_key !== undefined)
      localStorage.setItem("codex_api_key", partial.codex_api_key);
    if (partial.aliyun_stt_key !== undefined)
      localStorage.setItem("aliyun_stt_key", partial.aliyun_stt_key);
    if (partial.github_repo !== undefined)
      localStorage.setItem("github_repo", partial.github_repo);
    if (partial.github_token !== undefined)
      localStorage.setItem("github_token", partial.github_token);

    console.log("[useConfig] saving to Rust backend:", {
      has_aliyun_stt_key: !!updated.aliyun_stt_key,
    });

    try {
      await invoke("save_config", { config: updated });
      console.log("[useConfig] Rust save_config succeeded");
      set({ config: updated });
    } catch (e) {
      console.error("[useConfig] Rust save_config failed:", e);
      // Still update local state even if Rust save fails
      set({ config: updated });
    }
  },
}));
