"use client";

import { addDays, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { AllDayEventBlock } from "./event-block";
import type { CalendarEvent } from "./types";

interface AllDayRowProps {
  viewStart: Date;
  visibleDays: number;
  events: CalendarEvent[];
}

export function AllDayRow({ viewStart, visibleDays, events }: AllDayRowProps) {
  if (events.length === 0) return null;

  const days = Array.from({ length: visibleDays }, (_, i) => addDays(viewStart, i));

  return (
    <div
      className="shrink-0 border-b border-border"
      style={{
        display: "grid",
        gridTemplateColumns: `44px repeat(${visibleDays}, 1fr)`,
      }}
    >
      <div className="flex items-start justify-end pr-2 pt-1">
        <span className="text-[10px] text-muted-foreground">all-day</span>
      </div>
      {days.map((day, i) => {
        const dayEvents = events.filter((e) => {
          const eventStart = parseISO(e.start);
          const eventEnd = parseISO(e.end);
          return (
            isSameDay(eventStart, day) ||
            (eventStart < day && eventEnd > day)
          );
        });

        const today = new Date();
        const isToday = isSameDay(day, today);

        return (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-0.5 p-1 min-h-[28px] border-l border-border min-w-0 overflow-hidden",
              
            )}
          >
            {dayEvents.map((event) => (
              <AllDayEventBlock
                key={event.id}
                event={event}
                color={event.calendarColor}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
