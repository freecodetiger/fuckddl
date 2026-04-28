import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { SyncMeta } from "../types";

interface SyncState {
  meta: SyncMeta | null;
  syncing: boolean;
  lastError: string | null;
  refreshStatus: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const useSync = create<SyncState>((set) => ({
  meta: null,
  syncing: false,
  lastError: null,

  refreshStatus: async () => {
    try {
      const meta = await invoke<SyncMeta>("sync_status");
      set({ meta, lastError: null });
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  syncNow: async () => {
    const repoUrl = localStorage.getItem("github_repo") || "";
    const branch = localStorage.getItem("github_branch") || "main";
    const token = localStorage.getItem("github_token") || "";

    if (!repoUrl || !token) {
      set({ lastError: "请先在设置中配置 GitHub 仓库和 Token" });
      return;
    }

    set({ syncing: true, lastError: null });
    try {
      const meta = await invoke<SyncMeta>("sync_now", {
        repoUrl,
        branch,
        token,
      });
      set({ meta, syncing: false });
    } catch (e) {
      set({ lastError: String(e), syncing: false });
    }
  },
}));
