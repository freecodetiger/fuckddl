import { useState } from "react";

interface Config {
  github_token?: string;
  github_repo?: string;
  codex_api_url?: string;
  codex_api_key?: string;
  aliyun_stt_key?: string;
}

interface SettingsViewProps {
  config: Config;
  onSave: (partial: Config) => Promise<void>;
}

function ConfigField({
  label,
  value,
  placeholder,
  type = "text",
  hint,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "password";
  hint?: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  const handleSave = () => {
    onChange(local);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        className="flex items-center justify-between py-[11px] cursor-pointer rounded-[10px] px-[10px] -mx-[10px] hover:bg-bg-secondary transition-colors duration-150"
        onClick={() => { setLocal(value); setEditing(true); }}
      >
        <span className="text-[14px] text-text-primary font-[500]">{label}</span>
        <div className="flex items-center gap-[6px]">
          <span className="text-[13px] text-text-tertiary max-w-[170px] truncate text-right">
            {value
              ? type === "password"
                ? "●".repeat(Math.min(value.length, 12))
                : value
              : "未设置"}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" opacity="0.25">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="py-[6px]">
      <div className="text-[12px] text-text-tertiary mb-[6px] ml-[2px]">{label}</div>
      <div className="flex gap-[8px]">
        <input
          type={type}
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          className="flex-1 bg-bg-secondary border border-separator rounded-[10px] px-[12px] py-[9px] text-[14px] text-text-primary outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
          autoFocus
          onBlur={() => { if (local !== value) handleSave(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          className="px-[14px] py-[8px] bg-accent text-white rounded-[10px] text-[13px] font-[600] shrink-0 hover:opacity-90 transition-opacity"
          onClick={handleSave}
        >
          保存
        </button>
      </div>
      {hint && (
        <div className="text-[11px] text-text-tertiary mt-[4px] ml-[2px] leading-[1.4]">
          {hint}
        </div>
      )}
    </div>
  );
}

export function SettingsView({ config, onSave }: SettingsViewProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="pt-[52px] pb-[20px] px-[20px] flex-shrink-0">
        <span className="text-[17px] font-[600] text-text-primary">设置</span>
      </div>

      <div className="flex-1 overflow-y-auto px-[16px] space-y-[12px] pb-[40px]">
        {/* Voice Recognition */}
        <div
          className="rounded-[16px] bg-bg-card p-[18px]"
          style={{ boxShadow: "var(--shadow-hairline)" }}
        >
          <div className="flex items-center gap-[8px] mb-[2px]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "var(--color-accent)" }}>
              <rect x="8" y="1" width="4" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 9a5 5 0 0010 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10 15v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div>
              <div className="text-[13px] text-text-primary font-[600]">语音识别</div>
              <div className="text-[12px] text-text-tertiary">fun-asr-realtime · 百炼</div>
            </div>
          </div>
          <div className="mt-[10px]">
            <ConfigField
              label="DashScope API Key"
              value={config.aliyun_stt_key || ""}
              placeholder="sk-..."
              type="password"
              hint="在百炼控制台获取，需开通语音识别服务"
              onChange={(v) => onSave({ aliyun_stt_key: v })}
            />
          </div>
        </div>

        {/* AI Service */}
        <div
          className="rounded-[16px] bg-bg-card p-[18px]"
          style={{ boxShadow: "var(--shadow-hairline)" }}
        >
          <div className="flex items-center gap-[8px] mb-[2px]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "var(--color-accent-lavender)" }}>
              <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L10 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            <div>
              <div className="text-[13px] text-text-primary font-[600] flex items-center gap-[6px]">
                AI 服务
                <span
                  className="w-[6px] h-[6px] rounded-full inline-block"
                  style={{ backgroundColor: (config.codex_api_url && config.codex_api_key) ? "var(--color-accent-green)" : "var(--color-accent-rose)" }}
                />
              </div>
              <div className="text-[12px] text-text-tertiary">OpenAI 兼容接口</div>
            </div>
          </div>
          <div className="mt-[10px] space-y-[2px]">
            <ConfigField
              label="API 地址"
              value={config.codex_api_url || ""}
              placeholder="https://api.openai.com/v1"
              hint="OpenAI 兼容的 API 端点"
              onChange={(v) => onSave({ codex_api_url: v })}
            />
            <div className="h-[1px] bg-separator-light mx-[2px]" />
            <ConfigField
              label="API Key"
              value={config.codex_api_key || ""}
              placeholder="sk-..."
              type="password"
              onChange={(v) => onSave({ codex_api_key: v })}
            />
          </div>
        </div>

        {/* Git Sync */}
        <div
          className="rounded-[16px] bg-bg-card p-[18px]"
          style={{ boxShadow: "var(--shadow-hairline)" }}
        >
          <div className="flex items-center gap-[8px] mb-[2px]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "var(--color-accent-green)" }}>
              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.2" />
              <path d="M13 7l-5 5M7 7l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <div>
              <div className="text-[13px] text-text-primary font-[600]">同步</div>
              <div className="text-[12px] text-text-tertiary">GitHub 私有仓库</div>
            </div>
          </div>
          <div className="mt-[10px] space-y-[2px]">
            <ConfigField
              label="仓库"
              value={config.github_repo || ""}
              placeholder="user/repo"
              onChange={(v) => onSave({ github_repo: v })}
            />
            <div className="h-[1px] bg-separator-light mx-[2px]" />
            <ConfigField
              label="Token"
              value={config.github_token || ""}
              placeholder="ghp_..."
              type="password"
              onChange={(v) => onSave({ github_token: v })}
            />
          </div>
        </div>

        {/* About */}
        <div className="text-center pb-[24px] pt-[4px]">
          <span className="text-[12px] text-text-tertiary">fuckddl v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
