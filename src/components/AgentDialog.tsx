import { useEffect, useRef } from "react";

interface ConversationItem {
  type: "user" | "ai-text" | "ai-tool";
  text: string;
  detail?: string;
  id: string;
}

interface AgentDialogProps {
  visible: boolean;
  items: ConversationItem[];
  steps?: { id: string; label: string; status: string }[];
  processing: boolean;
  pendingConfirmation?: { type: string; id: string; title: string } | null;
  onConfirmDelete?: () => void;
  onDismissConfirmation?: () => void;
  onClose: () => void;
}

// Claude-inspired pulsing dot — simple, elegant
function ClaudeDot({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center w-[20px] h-[20px]">
      <div
        className="rounded-full transition-all duration-500"
        style={{
          width: active ? "10px" : "7px",
          height: active ? "10px" : "7px",
          backgroundColor: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
          animation: active ? "claude-pulse 1.8s ease-in-out infinite" : "none",
        }}
      />
    </div>
  );
}

export function AgentDialog({ visible, items, steps, processing, pendingConfirmation, onConfirmDelete, onDismissConfirmation, onClose }: AgentDialogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  if (!visible || (items.length === 0 && !processing)) return null;

  return (
    <div className="absolute bottom-[90px] inset-x-[16px] z-30 flex justify-center pointer-events-none">
      <div
        className="w-full max-w-[380px] pointer-events-auto bg-bg-card rounded-[22px] overflow-hidden flex flex-col"
        style={{
          boxShadow: processing
            ? "0 8px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04), 0 0 60px rgba(0,0,0,0.03)"
            : "0 8px 32px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
          animation: "dialog-rise 0.35s cubic-bezier(0.22, 0.61, 0.36, 1) both",
          transformOrigin: "bottom center",
          transition: "box-shadow 0.6s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — refined */}
        <div className="flex items-center gap-[10px] px-[18px] pt-[16px] pb-[10px]">
          <ClaudeDot active={processing} />
          <span className="text-[15px] font-[600] text-text-primary tracking-[-0.01em]">Agent</span>
          <div className="flex-1" />
          <button
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-text-tertiary hover:bg-bg-secondary transition-colors"
            onClick={onClose}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Steps — refined pills */}
        {steps && steps.length > 0 && (
          <div className="px-[18px] pb-[10px] flex items-center gap-[10px] flex-wrap">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-[6px]">
                <div
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: s.status === "active" ? "6px" : "5px",
                    height: s.status === "active" ? "6px" : "5px",
                    backgroundColor:
                      s.status === "completed" ? "var(--color-text-secondary)"
                      : s.status === "active" ? "var(--color-text-primary)"
                      : "var(--color-text-tertiary)",
                    animation: s.status === "active" ? "claude-pulse 1.8s ease-in-out infinite" : "none",
                  }}
                />
                <span
                  className="text-[12px] leading-[1.3] tracking-[-0.01em]"
                  style={{
                    color: s.status === "active" ? "var(--color-text-primary)" : s.status === "completed" ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
                    fontWeight: s.status === "active" ? 500 : 400,
                  }}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <span className="text-[10px] text-text-tertiary mx-[2px]">·</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Conversation — refined typography */}
        <div className="px-[16px] pb-[16px] space-y-[8px] max-h-[200px] overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className={`flex ${item.type === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] px-[13px] py-[8px] rounded-[14px] text-[13px] leading-[1.5] tracking-[-0.01em] ${
                  item.type === "user"
                    ? "bg-text-primary text-white rounded-br-[5px]"
                    : item.type === "ai-tool"
                      ? "bg-bg-secondary text-text-secondary rounded-bl-[5px] text-[12px]"
                      : "bg-bg-secondary text-text-primary rounded-bl-[5px]"
                }`}
              >
                {item.type === "ai-tool" && (
                  <div className="flex items-center gap-[5px] mb-[3px]">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
                      <circle cx="2" cy="6" r="1" fill="currentColor" />
                      <circle cx="6" cy="6" r="1" fill="currentColor" />
                      <circle cx="10" cy="6" r="1" fill="currentColor" />
                    </svg>
                    <span className="font-[600] text-[11px] text-text-secondary">{item.text}</span>
                  </div>
                )}
                <span className={item.type === "ai-tool" ? "text-text-tertiary" : ""}>
                  {item.type === "ai-tool"
                    ? item.detail || ""
                    : item.text}
                </span>
              </div>
            </div>
          ))}

          {/* Processing — Claude-style breathing dot */}
          {processing && items.length === 0 && (
            <div className="flex justify-center py-[20px]">
              <ClaudeDot active />
            </div>
          )}
          {processing && items.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-bg-secondary rounded-[14px] rounded-bl-[5px] px-[13px] py-[8px] flex items-center gap-[8px]">
                <ClaudeDot active />
                <span className="text-[12px] text-text-tertiary">思考中</span>
              </div>
            </div>
          )}

          {/* Delete confirmation */}
          {pendingConfirmation && (
            <div className="p-[14px] rounded-[16px] animate-fade-in-up" style={{ backgroundColor: "var(--color-accent-rose-soft)", border: "1px solid rgba(255,59,48,0.15)" }}>
              <p className="text-[14px] font-[600] text-text-primary mb-[2px]">确定删除？</p>
              <p className="text-[12px] text-text-secondary mb-[12px]">「{pendingConfirmation.title}」将被永久删除，无法恢复</p>
              <div className="flex gap-[8px]">
                <button className="flex-1 py-[9px] rounded-[12px] text-[13px] font-[500] bg-white/70 text-text-primary transition-colors hover:bg-white" onClick={onDismissConfirmation}>取消</button>
                <button className="flex-1 py-[9px] rounded-[12px] text-[13px] font-[600] text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--color-accent-rose)" }} onClick={onConfirmDelete}>确认删除</button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
