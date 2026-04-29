import { useState } from "react";

interface TodoConfirmCardProps {
  title: string;
  deadline: string;
  priority: string;
  estimatedMinutes?: number;
  description?: string;
  onConfirm: (data: {
    title: string;
    deadline: string;
    priority: string;
    estimatedMinutes?: number;
    description?: string;
  }) => void;
  onCancel: () => void;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function TodoConfirmCard({
  title: initialTitle,
  deadline: initialDeadline,
  priority: initialPriority,
  estimatedMinutes: initialEstimate,
  description: initialDesc,
  onConfirm,
  onCancel,
}: TodoConfirmCardProps) {
  const [title, setTitle] = useState(initialTitle);
  const [deadline, setDeadline] = useState(initialDeadline.slice(0, 10));
  const [priority, setPriority] = useState(initialPriority);
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialEstimate);
  const [description, setDescription] = useState(initialDesc || "");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 animate-fade-in-up" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-[420px] bg-bg-card rounded-t-[20px] px-[20px] pt-[24px] pb-[36px] animate-fade-in-up"
        style={{ animationDuration: "0.25s", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-[600] text-text-primary text-center mb-[16px]">
          确认待办
        </h3>

        {/* Title */}
        <label className="text-[12px] text-text-tertiary mb-[4px] block">标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-bg-secondary border border-separator rounded-[10px] px-[12px] py-[9px] text-[14px] text-text-primary outline-none focus:border-accent mb-[12px]"
        />

        {/* Deadline */}
        <label className="text-[12px] text-text-tertiary mb-[4px] block">截止日期</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full bg-bg-secondary border border-separator rounded-[10px] px-[12px] py-[9px] text-[14px] text-text-primary outline-none focus:border-accent mb-[12px]"
        />

        {/* Expand details */}
        <button
          className="text-[13px] text-accent font-[500] mb-[12px]"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起详情 ▲" : "编辑详情 ▼"}
        </button>

        {expanded && (
          <div className="mb-[12px] space-y-[10px] animate-fade-in-up">
            {/* Priority */}
            <div>
              <label className="text-[12px] text-text-tertiary mb-[4px] block">优先级</label>
              <div className="flex gap-[8px]">
                {(["high", "medium", "low"] as const).map((p) => (
                  <button
                    key={p}
                    className={`flex-1 py-[8px] rounded-[8px] text-[13px] font-[500] transition-colors ${
                      priority === p
                        ? "bg-accent text-white"
                        : "bg-bg-secondary text-text-tertiary"
                    }`}
                    onClick={() => setPriority(p)}
                  >
                    {p === "high" ? "高" : p === "medium" ? "中" : "低"}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated minutes */}
            <div>
              <label className="text-[12px] text-text-tertiary mb-[4px] block">预估时长（分钟）</label>
              <input
                type="number"
                value={estimatedMinutes || ""}
                onChange={(e) => setEstimatedMinutes(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="如 60"
                className="w-full bg-bg-secondary border border-separator rounded-[10px] px-[12px] py-[9px] text-[14px] text-text-primary outline-none focus:border-accent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[12px] text-text-tertiary mb-[4px] block">描述</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="补充说明..."
                className="w-full bg-bg-secondary border border-separator rounded-[10px] px-[12px] py-[9px] text-[14px] text-text-primary outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-[10px]">
          <button
            className="flex-1 py-[12px] rounded-[12px] text-[15px] font-[500] bg-bg-secondary text-text-primary hover:bg-separator-light transition-colors"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="flex-1 py-[12px] rounded-[12px] text-[15px] font-[600] text-white bg-accent hover:opacity-90 transition-opacity"
            onClick={() =>
              onConfirm({
                title,
                deadline: deadline + "T23:59:00",
                priority,
                estimatedMinutes,
                description: description || undefined,
              })
            }
          >
            确认添加
          </button>
        </div>
      </div>
    </div>
  );
}
