import { useSync } from "../hooks/useSync";
import { useEffect } from "react";

export function SyncIndicator() {
  const { meta, syncing, refreshStatus } = useSync();

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const hasSynced = meta?.last_sync_at && meta.last_sync_at !== "never";

  return (
    <div className="absolute top-[44px] left-[20px] flex items-center gap-[4px]">
      <div
        className={`w-[5px] h-[5px] rounded-full transition-colors duration-300 ${
          syncing
            ? "bg-accent animate-pulse-record"
            : hasSynced
              ? "bg-accent"
              : "bg-text-tertiary"
        }`}
      />
      <span className="text-[11px] text-text-tertiary">
        {syncing ? "同步中..." : hasSynced ? "已同步" : ""}
      </span>
    </div>
  );
}
