import { useMemo } from "react";
import type { ScheduleEvent } from "../types";

interface CalendarViewProps {
  events: ScheduleEvent[];
  today: Date;
  monthYearLabel: string;
  onSelectDate: (dateStr: string) => void;
}

function buildHeatmap(events: ScheduleEvent[], year: number, month: number, today: Date) {
  // Count events per day
  const counts: Record<number, number> = {};
  for (const e of events) {
    const d = parseInt(e.start_time.slice(8, 10), 10) || 0;
    if (d > 0 && d <= 31) counts[d] = (counts[d] || 0) + 1;
  }

  const maxCount = Math.max(1, ...Object.values(counts));
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: { day: number; count: number; intensity: number; isToday: boolean }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const count = counts[d] || 0;
    cells.push({
      day: d,
      count,
      intensity: count / maxCount,
      isToday: d === today.getDate(),
    });
  }

  return { cells, maxCount, total: events.length };
}

export function CalendarView({ events, today, monthYearLabel, onSelectDate }: CalendarViewProps) {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const heatmap = useMemo(() => buildHeatmap(events, year, month, today), [events, year, month, today]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="pt-[52px] pb-[12px] px-[20px] flex-shrink-0">
        <span className="text-[17px] font-[600] text-text-primary">{monthYearLabel}</span>
      </div>

      {/* Heatmap */}
      <div className="px-[16px] mb-[12px] flex-shrink-0">
        <div className="text-[12px] font-[500] text-text-tertiary mb-[6px]">日程密度</div>
        <div className="grid grid-cols-7 gap-[3px]">
          {heatmap.cells.map((cell) => (
            <div
              key={cell.day}
              className="aspect-square rounded-[3px] flex items-center justify-center cursor-pointer text-[10px] font-[600] transition-colors hover:ring-1 ring-text-primary/20"
              style={{
                backgroundColor: cell.count === 0
                  ? "var(--color-bg-secondary)"
                  : `rgba(0,0,0,${0.08 + cell.intensity * 0.75})`,
                color: cell.intensity > 0.5 ? "#fff" : cell.isToday ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                outline: cell.isToday ? "1.5px solid var(--color-text-primary)" : "none",
                outlineOffset: "-1px",
              }}
              onClick={() => {
                const ds = `${year}-${String(month).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                onSelectDate(ds);
              }}
            >
              {cell.day}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-[6px] mt-[6px]">
          <span className="text-[10px] text-text-tertiary">少</span>
          {[0, 0.25, 0.5, 0.75, 1].map((i) => (
            <div key={i} className="w-[12px] h-[12px] rounded-[2px]" style={{ backgroundColor: i === 0 ? "var(--color-bg-secondary)" : `rgba(0,0,0,${0.08 + i * 0.75})` }} />
          ))}
          <span className="text-[10px] text-text-tertiary">多</span>
          <span className="text-[10px] text-text-tertiary ml-[12px]">{heatmap.total} 个日程</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-[14px] text-center mb-[4px]">
        {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
          <div key={d} className="text-[11px] text-text-tertiary py-[3px] font-[500]">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-[14px] auto-rows-fr">
        {Array.from({ length: 30 }, (_, i) => {
          const d = i + 1;
          const isToday = d === today.getDate();
          const hasEvents = events.some((e) => e.start_time.slice(8, 10) === String(d).padStart(2, "0"));
          return (
            <button key={d} className="flex flex-col items-center justify-start pt-[4px] text-[15px] h-[40px] border-0 bg-transparent cursor-pointer"
              onClick={() => {
                const ds = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                onSelectDate(ds);
              }}>
              <span className={isToday ? "bg-text-primary text-white rounded-full w-[30px] h-[30px] flex items-center justify-center font-[700] text-[14px]" : "text-text-primary"}>
                {d}
              </span>
              {hasEvents && !isToday && <div className="w-[4px] h-[4px] rounded-full bg-text-primary mt-[2px]" />}
            </button>
          );
        })}
      </div>

      {/* All events list */}
      <div className="flex-shrink-0 mt-[12px]">
        <div className="text-[12px] font-[500] text-text-tertiary mx-[16px] mb-[6px]">全部日程</div>
        <div className="max-h-[160px] overflow-y-auto px-[4px]">
          {events.length === 0 ? (
            <div className="text-[13px] text-text-tertiary text-center py-[16px]">暂无日程</div>
          ) : (
            [...events].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((event) => (
              <div key={event.id} className="text-[14px] text-text-primary py-[3px] flex items-center gap-[8px] mx-[12px]">
                <span className="text-text-tertiary text-[12px] min-w-[38px] font-[500]">{event.start_time.slice(5, 10)}</span>
                <span className="text-text-tertiary text-[12px] min-w-[34px] font-[500]">{event.start_time.slice(11, 16)}</span>
                <span className="truncate">{event.title}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
