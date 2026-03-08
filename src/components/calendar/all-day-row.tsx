"use client";

import { addDays, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { AllDayEventBlock } from "./event-block";
import type { CalendarEvent } from "./types";

interface AllDayRowProps {
  weekStart: Date;
  events: CalendarEvent[];
}

export function AllDayRow({ weekStart, events }: AllDayRowProps) {
  if (events.length === 0) return null;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
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
              isToday && "bg-primary/5",
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
