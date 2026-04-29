import type { TodoItem } from "../types";

interface TodoCardProps {
  todo: TodoItem;
  isNew?: boolean;
  onToggle?: (todoId: string) => void;
}

const PRIORITY_STYLES = {
  high: {
    bg: "var(--color-accent-rose-soft)",
    border: "var(--color-accent-rose)",
    text: "var(--color-accent-rose)",
    label: "!!",
  },
  medium: {
    bg: "var(--color-accent-soft)",
    border: "var(--color-accent)",
    text: "var(--color-accent)",
    label: "!",
  },
  low: {
    bg: "var(--color-bg-secondary)",
    border: "var(--color-text-tertiary)",
    text: "var(--color-text-tertiary)",
    label: "",
  },
};

function deadlineCountdown(isoString: string): { text: string; urgent: boolean } {
  const now = new Date();
  const deadline = new Date(isoString);
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 0) return { text: "已逾期", urgent: true };
  if (diffHours < 1) return { text: "即将截止", urgent: true };
  if (diffHours < 24) return { text: `${Math.floor(diffHours)}小时`, urgent: diffHours < 4 };
  if (diffDays === 1) return { text: "明天截止", urgent: false };
  if (diffDays <= 3) return { text: `${diffDays}天后`, urgent: false };
  return { text: isoString.slice(0, 10), urgent: false };
}

export function TodoCard({ todo, isNew, onToggle }: TodoCardProps) {
  const isDone = todo.status === "done";
  const isCancelled = todo.status === "cancelled";
  const style = PRIORITY_STYLES[todo.priority];
  const countdown = deadlineCountdown(todo.deadline);

  return (
    <div
      className={`shrink-0 w-[170px] rounded-[16px] p-[14px] cursor-pointer select-none transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] ${
        isNew ? "animate-card-enter" : ""
      }`}
      style={{
        backgroundColor: style.bg,
        border: `1.5px solid ${style.border}`,
        opacity: isCancelled ? 0.3 : isDone ? 0.5 : 1,
      }}
      onClick={() => onToggle?.(todo.id)}
    >
      {/* Priority badge */}
      <div className="flex items-center justify-between mb-[8px]">
        <span
          className="text-[10px] font-[700] px-[6px] py-[1px] rounded-[4px]"
          style={{ backgroundColor: style.border, color: "#fff" }}
        >
          {todo.priority === "high" ? "高优先" : todo.priority === "medium" ? "中优先" : "低优先"}
        </span>
        {isDone && (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" fill="var(--color-accent-green)" />
            <path d="M5.5 9l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Title */}
      <p
        className="text-[15px] font-[600] leading-[1.3] mb-[10px] line-clamp-2"
        style={{
          color: "var(--color-text-primary)",
          textDecoration: isDone ? "line-through" : isCancelled ? "line-through" : "none",
        }}
      >
        {todo.title}
      </p>

      {/* Deadline countdown */}
      <div className="flex items-end justify-between">
        <div>
          <span
            className="text-[13px] font-[700]"
            style={{ color: countdown.urgent ? "var(--color-accent-rose)" : style.text }}
          >
            {countdown.text}
          </span>
          {todo.estimated_minutes && (
            <span className="text-[11px] text-text-tertiary ml-[4px]">
              {todo.estimated_minutes < 60 ? `${todo.estimated_minutes}分` : `${Math.floor(todo.estimated_minutes / 60)}时`}
            </span>
          )}
        </div>
        {/* Urgency dot */}
        {countdown.urgent && (
          <div className="w-[6px] h-[6px] rounded-full animate-pulse-dot" style={{ backgroundColor: "var(--color-accent-rose)" }} />
        )}
      </div>

      {/* Progress bar for remaining time */}
      {!isDone && !isCancelled && todo.estimated_minutes && (
        <div className="mt-[8px] h-[3px] rounded-full bg-white/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(5, countdown.urgent ? 80 : 30))}%`,
              backgroundColor: countdown.urgent ? "var(--color-accent-rose)" : style.border,
            }}
          />
        </div>
      )}
    </div>
  );
}
