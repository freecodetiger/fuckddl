import type { ScheduleEvent } from "../types";
import { ScheduleCard } from "./ScheduleCard";

interface ScheduleListProps {
  events: ScheduleEvent[];
  newestId?: string | null;
  onToggle: (eventId: string) => void;
}

interface TimeGroup {
  label: string;
  events: ScheduleEvent[];
}

function groupByTimeOfDay(events: ScheduleEvent[]): TimeGroup[] {
  const morning: ScheduleEvent[] = [];
  const afternoon: ScheduleEvent[] = [];
  const evening: ScheduleEvent[] = [];
  const allDay: ScheduleEvent[] = [];

  for (const event of events) {
    if (event.all_day) {
      allDay.push(event);
    } else {
      const hour = parseInt(event.start_time.slice(11, 13), 10) || 0;
      if (hour < 12) {
        morning.push(event);
      } else if (hour < 18) {
        afternoon.push(event);
      } else {
        evening.push(event);
      }
    }
  }

  const groups: TimeGroup[] = [];
  if (allDay.length > 0) groups.push({ label: "全天", events: allDay });
  if (morning.length > 0) groups.push({ label: "上午", events: morning });
  if (afternoon.length > 0) groups.push({ label: "下午", events: afternoon });
  if (evening.length > 0) groups.push({ label: "晚上", events: evening });

  return groups;
}

export function ScheduleList({ events, newestId, onToggle }: ScheduleListProps) {
  if (events.length === 0) return null;

  const groups = groupByTimeOfDay(events);

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <div key={group.label} className="mb-[8px]">
          <div className="text-[12px] font-[500] text-text-tertiary mx-[28px] mb-[4px] mt-[4px]">
            {group.label}
          </div>
          {group.events.map((event, i) => (
            <div
              key={event.id}
              className={event.id === newestId ? "animate-slide-in-top" : "animate-card-enter"}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <ScheduleCard
                event={event}
                isLast={i === group.events.length - 1}
                onToggle={onToggle}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
