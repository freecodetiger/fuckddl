import type { TodoItem } from "../types";

interface TodoCardProps {
  todo: TodoItem;
  isNew?: boolean;
  onToggle?: (todoId: string) => void;
}

const PRIORITY_COLORS = {
  high: { bar: "var(--color-accent-rose)", bg: "var(--color-accent-rose-soft)" },
  medium: { bar: "var(--color-accent)", bg: "var(--color-accent-soft)" },
  low: { bar: "var(--color-text-tertiary)", bg: "var(--color-bg-secondary)" },
};

function formatDeadline(isoString: string): string {
  const match = isoString.match(/T(\d{2}:\d{2})/);
  const datePart = isoString.slice(0, 10);
  const now = new Date();
  const deadline = new Date(isoString);
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `已逾期 ${datePart}`;
  if (diffDays === 0) return `今天${match ? " " + match[1] : ""}`;
  if (diffDays === 1) return `明天${match ? " " + match[1] : ""}`;
  if (diffDays <= 7) return `${diffDays}天后 · ${datePart}`;
  return datePart;
}

function formatEstimate(minutes?: number): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
}

export function TodoCard({ todo, isNew, onToggle }: TodoCardProps) {
  const isDone = todo.status === "done";
  const isCancelled = todo.status === "cancelled";
  const colors = PRIORITY_COLORS[todo.priority];
  const estimate = formatEstimate(todo.estimated_minutes);

  return (
    <div
      className={`relative mx-[16px] mb-[6px] cursor-pointer select-none transition-all duration-200 hover:bg-bg-secondary/60 active:bg-bg-secondary rounded-[12px] ${
        isNew ? "animate-card-enter" : ""
      }`}
      style={{ opacity: isCancelled ? 0.35 : 1 }}
      onClick={() => onToggle?.(todo.id)}
    >
      <div className="flex items-start gap-[12px]">
        {/* Left: priority color bar + status circle */}
        <div className="flex flex-col items-center shrink-0 pt-[14px]">
          {/* Priority bar */}
          <div
            className="w-[3px] h-[40px] rounded-full"
            style={{ backgroundColor: colors.bar }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-[12px]" style={{ borderBottom: "0.5px solid var(--color-separator-light)" }}>
          {/* Title */}
          <span
            className="text-[16px] leading-[1.35] block font-[500]"
            style={{
              color: isCancelled ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
              textDecoration: isDone ? "line-through" : isCancelled ? "line-through" : "none",
            }}
          >
            {todo.title}
          </span>

          {/* Meta row */}
          <div className="flex items-center gap-[8px] mt-[4px] flex-wrap">
            {/* Deadline */}
            <span className="text-[13px] font-[500]" style={{ color: colors.bar }}>
              {formatDeadline(todo.deadline)}
            </span>

            {/* Priority badge */}
            <span
              className="text-[11px] font-[500] px-[6px] py-[1px] rounded-[4px]"
              style={{ backgroundColor: colors.bg, color: colors.bar }}
            >
              {todo.priority === "high" ? "高优先" : todo.priority === "medium" ? "中优先" : "低优先"}
            </span>

            {/* Estimated time */}
            {estimate && (
              <span className="text-[12px] text-text-tertiary">
                {estimate}
              </span>
            )}
          </div>

          {/* Description */}
          {todo.description && !isCancelled && (
            <p className="text-[13px] leading-[1.35] mt-[3px] text-text-secondary">
              {todo.description}
            </p>
          )}
        </div>

        {/* Done check */}
        {isDone && (
          <div className="shrink-0 pt-[14px]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" fill="var(--color-accent-green)" />
              <path d="M5.5 9l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
