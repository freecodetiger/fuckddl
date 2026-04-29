import type { ScheduleEvent } from "../types";

interface ScheduleCardProps {
  event: ScheduleEvent;
  isLast?: boolean;
  isUpcoming?: boolean;
  isPast?: boolean;
  isToday?: boolean;
  onToggle?: (eventId: string) => void;
}

function extractTime(isoString: string): string {
  const match = isoString.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function formatDateLabel(isoString: string): string {
  const d = new Date(isoString);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[d.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

const CANDY_COLORS = [
  { bg: "var(--color-candy-pink)", text: "var(--color-candy-pink-text)" },
  { bg: "var(--color-candy-mint)", text: "var(--color-candy-mint-text)" },
  { bg: "var(--color-candy-lavender)", text: "var(--color-candy-lavender-text)" },
  { bg: "var(--color-candy-yellow)", text: "var(--color-candy-yellow-text)" },
  { bg: "var(--color-candy-blue)", text: "var(--color-candy-blue-text)" },
];

function candyColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return CANDY_COLORS[Math.abs(h) % CANDY_COLORS.length];
}

export function ScheduleCard({ event, isLast, isUpcoming, isPast, isToday, onToggle }: ScheduleCardProps) {
  const isDone = event.status === "done";
  const isCancelled = event.status === "cancelled";
  const timeLabel = event.all_day ? "全天" : extractTime(event.start_time);
  const dateLabel = formatDateLabel(event.start_time);
  const endTimeLabel = !event.all_day && event.end_time ? extractTime(event.end_time) : null;
  const candy = candyColor(event.id);

  return (
    <div
      className={`relative mx-[16px] cursor-pointer select-none transition-all duration-300 hover:bg-bg-secondary/60 active:bg-bg-secondary rounded-[12px] ${isCancelled ? "animate-fade-out" : ""}`}
      onClick={() => onToggle?.(event.id)}
      style={{
        opacity: isCancelled ? 0.3 : isPast ? 0.55 : 1,
        backgroundColor: isToday && !isDone && !isCancelled ? candy.bg : "transparent",
        transform: isCancelled ? "scale(0.96)" : "scale(1)",
      }}
    >
      <div className="flex items-start gap-[12px]">
        {/* Left: status circle + timeline connector */}
        <div className="flex flex-col items-center shrink-0 pt-[14px]">
          <div
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 transition-all duration-200"
            style={{
              borderColor: isToday && !isDone && !isCancelled ? candy.text
                : isDone ? "var(--color-text-tertiary)"
                : isCancelled ? "var(--color-text-tertiary)"
                : isPast ? "var(--color-text-tertiary)"
                : "var(--color-text-primary)",
              backgroundColor: isDone ? "var(--color-text-tertiary)" : "transparent",
            }}
          >
            {isDone && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isCancelled && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 2l6 6M8 2l-6 6" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
            {!isDone && !isCancelled && (
              <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: isToday ? candy.text : "var(--color-text-primary)" }} />
            )}
          </div>
          {!isLast && (
            <div className="w-[1px] flex-1 min-h-[20px] mt-[6px]" style={{ backgroundColor: "var(--color-separator-light)" }} />
          )}
        </div>

        {/* Right: content */}
        <div className="flex-1 min-w-0 py-[12px]" style={{ borderBottom: isLast ? "none" : "0.5px solid var(--color-separator-light)" }}>
          <span
            className="text-[16px] leading-[1.35] block font-[500]"
            style={{ color: isDone || isCancelled ? "var(--color-text-tertiary)" : "var(--color-text-primary)", textDecoration: isCancelled ? "line-through" : isDone ? "line-through" : "none" }}
          >
            {event.title}
          </span>

          {/* Date + Time row */}
          <div className="flex items-center gap-[6px] mt-[3px]">
            <span className="text-[12px] font-[500]" style={{ color: isToday ? candy.text : "var(--color-text-secondary)" }}>{dateLabel}</span>
            {!event.all_day && (
              <>
                <span className="text-[12px] font-[600]" style={{ color: isPast ? "var(--color-text-tertiary)" : isToday ? candy.text : "var(--color-text-primary)" }}>{timeLabel}</span>
                {endTimeLabel && (
                  <>
                    <span className="text-[11px] text-text-tertiary">-</span>
                    <span className="text-[12px] text-text-secondary">{endTimeLabel}</span>
                  </>
                )}
              </>
            )}
            {event.all_day && (
              <span className="text-[11px] text-text-tertiary bg-bg-secondary px-[6px] py-[1px] rounded-[4px]">全天</span>
            )}
          </div>

          {event.description && !isCancelled && (
            <p className="text-[13px] leading-[1.35] mt-[3px] text-text-secondary">{event.description}</p>
          )}

          {event.reminder && !isCancelled && (
            <div className="flex items-center gap-[4px] mt-[3px]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="var(--color-text-tertiary)" strokeWidth="1.2" />
                <path d="M6 3.5v3l2 1" stroke="var(--color-text-tertiary)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-[11px] text-text-tertiary">提醒</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
