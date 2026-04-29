import { useState } from "react";
import type { ScheduleEvent } from "../types";
import { ScheduleCard } from "./ScheduleCard";

interface RecentActivityListProps {
  events: ScheduleEvent[];
  newestId?: string | null;
  todayStr?: string;
  hideOldPast?: boolean;
  onToggle: (eventId: string) => void;
}

export function RecentActivityList({ events, newestId, todayStr, hideOldPast, onToggle }: RecentActivityListProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  if (events.length === 0) return null;

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const active: ScheduleEvent[] = [];
  const completed: ScheduleEvent[] = [];
  const todayEvents: ScheduleEvent[] = [];
  const futureEvents: ScheduleEvent[] = [];
  const pastActive: ScheduleEvent[] = [];
  const oldPast: ScheduleEvent[] = [];

  for (const event of events) {
    if (event.status === "done" || event.status === "cancelled") {
      completed.push(event);
      continue;
    }

    const eventDate = event.start_time.slice(0, 10);
    const isToday = todayStr ? eventDate === todayStr : false;
    const diffDays = (new Date(event.start_time).getTime() - now) / oneDayMs;

    if (isToday) {
      todayEvents.push(event);
    } else if (diffDays > 0) {
      futureEvents.push(event);
    } else if (diffDays > -1) {
      pastActive.push(event);
    } else {
      oldPast.push(event);
    }
  }

  // Sort
  todayEvents.sort((a, b) => a.start_time.localeCompare(b.start_time));
  futureEvents.sort((a, b) => a.start_time.localeCompare(b.start_time));
  pastActive.sort((a, b) => b.start_time.localeCompare(a.start_time));
  oldPast.sort((a, b) => b.start_time.localeCompare(a.start_time));
  completed.sort((a, b) => b.start_time.localeCompare(a.start_time));

  const card = (event: ScheduleEvent, i: number, groupLength: number, isToday: boolean, isPast: boolean) => (
    <div key={event.id} className={event.id === newestId ? "animate-slide-in-top" : "animate-card-enter"} style={{ animationDelay: `${i * 0.04}s` }}>
      <ScheduleCard event={event} isLast={i === groupLength - 1} isToday={isToday} isPast={isPast} onToggle={onToggle} />
    </div>
  );

  return (
    <div className="flex flex-col">
      {/* Today's active events */}
      {todayEvents.length > 0 && (
        <div className="mb-[12px]">
          <div className="text-[12px] font-[600] text-text-tertiary mx-[20px] mb-[4px]">今天</div>
          {todayEvents.map((e, i) => card(e, i, todayEvents.length, true, false))}
        </div>
      )}

      {/* Future events */}
      {futureEvents.length > 0 && (
        <div className="mb-[12px]">
          {todayEvents.length > 0 && <div className="mx-[28px] mb-[8px] h-[1px] bg-separator-light" />}
          <div className="text-[12px] font-[500] text-text-tertiary mx-[20px] mb-[4px]">即将到来</div>
          {futureEvents.map((e, i) => card(e, i, futureEvents.length, false, false))}
        </div>
      )}

      {/* Past active */}
      {pastActive.length > 0 && (
        <div className="mb-[12px]">
          <div className="mx-[28px] mb-[8px] h-[1px] bg-separator-light" />
          <div className="text-[12px] font-[500] text-text-tertiary mx-[20px] mb-[4px]">已结束</div>
          {pastActive.map((e, i) => card(e, i, pastActive.length, false, true))}
        </div>
      )}

      {/* Old past — only without hideOldPast */}
      {!hideOldPast && oldPast.length > 0 && (
        <div className="mb-[12px]">
          <div className="mx-[28px] mb-[8px] h-[1px] bg-separator-light" />
          <div className="text-[12px] font-[500] text-text-tertiary mx-[20px] mb-[4px]">更早</div>
          {oldPast.map((e, i) => card(e, i, oldPast.length, false, true))}
        </div>
      )}

      {/* Completed — collapsed by default */}
      {completed.length > 0 && (
        <div className="mt-[4px] mb-[20px]">
          <button
            className="flex items-center gap-[6px] mx-[20px] text-[12px] font-[500] text-text-tertiary hover:text-text-secondary transition-colors py-[6px]"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              style={{ transform: showCompleted ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            已完成 {completed.length} 项
          </button>
          {showCompleted && (
            <div className="mt-[4px] opacity-50">
              {completed.map((e, i) => card(e, i, completed.length, false, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
