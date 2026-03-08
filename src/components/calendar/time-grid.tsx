"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, isSameDay, parseISO, startOfDay, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { EventBlock } from "./event-block";
import type { CalendarEvent, PositionedEvent } from "./types";

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function getEventMinutes(
  event: CalendarEvent,
  day: Date,
): { startMin: number; endMin: number } {
  const eventStart = parseISO(event.start);
  const eventEnd = parseISO(event.end);
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

  const clampedStart = eventStart < dayStart ? dayStart : eventStart;
  const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

  return {
    startMin: differenceInMinutes(clampedStart, dayStart),
    endMin: differenceInMinutes(clampedEnd, dayStart),
  };
}

function layoutOverlapping(events: CalendarEvent[], day: Date): PositionedEvent[] {
  if (events.length === 0) return [];

  const withMinutes = events.map((e) => ({
    event: e,
    ...getEventMinutes(e, day),
  }));

  withMinutes.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const columns: { endMin: number }[] = [];
  const assignments: { event: CalendarEvent; col: number; startMin: number; endMin: number }[] = [];

  for (const item of withMinutes) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c].endMin <= item.startMin) {
        columns[c].endMin = item.endMin;
        assignments.push({ ...item, col: c });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push({ endMin: item.endMin });
      assignments.push({ ...item, col: columns.length - 1 });
    }
  }

  const groups: typeof assignments[] = [];
  let currentGroup: typeof assignments = [];

  for (const item of assignments) {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
      continue;
    }
    const overlaps = currentGroup.some(
      (g) => item.startMin < g.endMin && item.endMin > g.startMin,
    );
    if (overlaps) {
      currentGroup.push(item);
    } else {
      groups.push(currentGroup);
      currentGroup = [item];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  const result: PositionedEvent[] = [];
  for (const group of groups) {
    const maxCol = Math.max(...group.map((g) => g.col)) + 1;
    for (const item of group) {
      result.push({
        ...item.event,
        column: item.col,
        totalColumns: maxCol,
      });
    }
  }

  return result;
}

interface TimeGridProps {
  weekStart: Date;
  events: CalendarEvent[];
}

export function TimeGrid({ weekStart, events }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = Math.max(0, (8 * HOUR_HEIGHT) - 40);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
      <div
        className="grid grid-cols-[60px_repeat(7,1fr)] relative"
        style={{ height: `${24 * HOUR_HEIGHT}px` }}
      >
        {/* Hour labels column */}
        <div className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground"
              style={{ top: `${hour * HOUR_HEIGHT}px` }}
            >
              {hour > 0 ? formatHour(hour) : ""}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIndex) => {
          const isToday = isSameDay(day, today);
          const dayEvents = events.filter((e) => {
            const eventStart = parseISO(e.start);
            const eventEnd = parseISO(e.end);
            return (
              isSameDay(eventStart, day) ||
              (eventStart < day && eventEnd > startOfDay(addDays(day, 1)))
            );
          });

          const positioned = layoutOverlapping(dayEvents, day);

          return (
            <div
              key={dayIndex}
              className={cn(
                "relative border-l border-border",
                isToday && "bg-primary/3",
              )}
            >
              {/* Hour grid lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/50"
                  style={{ top: `${hour * HOUR_HEIGHT}px` }}
                />
              ))}

              {/* Half-hour grid lines */}
              {HOURS.map((hour) => (
                <div
                  key={`half-${hour}`}
                  className="absolute inset-x-0 border-t border-border/25"
                  style={{ top: `${hour * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                />
              ))}

              {/* Events */}
              {positioned.map((event) => {
                const { startMin, endMin } = getEventMinutes(event, day);
                return (
                  <EventBlock
                    key={event.id}
                    event={event}
                    startMinutes={startMin}
                    endMinutes={endMin}
                    hourHeight={HOUR_HEIGHT}
                  />
                );
              })}

              {/* Current time indicator */}
              {isToday && (
                <div
                  className="absolute inset-x-0 z-20 pointer-events-none"
                  style={{ top: `${(currentMinute / 60) * HOUR_HEIGHT}px` }}
                >
                  <div className="relative flex items-center">
                    <div className="absolute -left-[5px] size-[10px] rounded-full bg-red-500" />
                    <div className="w-full h-[2px] bg-red-500" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
