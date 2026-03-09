import { addDays, parseISO, startOfDay, differenceInMinutes, isSameDay } from "date-fns";
import type { CalendarEvent } from "@/components/calendar/types";

export interface FreeTimeSlot {
  dayIndex: number;
  startMin: number;
  endMin: number;
}

const DAY_START_MIN = 0;
const DAY_END_MIN = 24 * 60;

/**
 * Given the current user's events and a map of friend events,
 * computes per-day free time slots where everyone is available.
 */
export function computeFreeSlots(
  userEvents: CalendarEvent[],
  friendEventsMap: Record<string, CalendarEvent[]>,
  viewStart: Date,
  visibleDays = 7,
): FreeTimeSlot[] {
  const allEvents = [
    ...userEvents,
    ...Object.values(friendEventsMap).flat(),
  ];

  const days = Array.from({ length: visibleDays }, (_, i) => addDays(viewStart, i));
  const slots: FreeTimeSlot[] = [];

  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const day = days[dayIndex];
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);

    const busyIntervals: { start: number; end: number }[] = [];

    for (const event of allEvents) {
      if (event.isAllDay) continue;

      const eventStart = parseISO(event.start);
      const eventEnd = parseISO(event.end);

      if (eventEnd <= dayStart || eventStart >= dayEnd) continue;

      const clampedStart = eventStart < dayStart ? dayStart : eventStart;
      const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

      busyIntervals.push({
        start: differenceInMinutes(clampedStart, dayStart),
        end: differenceInMinutes(clampedEnd, dayStart),
      });
    }

    if (busyIntervals.length === 0) {
      slots.push({ dayIndex, startMin: DAY_START_MIN, endMin: DAY_END_MIN });
      continue;
    }

    busyIntervals.sort((a, b) => a.start - b.start || a.end - b.end);

    const merged: { start: number; end: number }[] = [];
    for (const interval of busyIntervals) {
      const last = merged[merged.length - 1];
      if (last && interval.start <= last.end) {
        last.end = Math.max(last.end, interval.end);
      } else {
        merged.push({ ...interval });
      }
    }

    let cursor = DAY_START_MIN;
    for (const busy of merged) {
      if (busy.start > cursor) {
        slots.push({ dayIndex, startMin: cursor, endMin: busy.start });
      }
      cursor = Math.max(cursor, busy.end);
    }
    if (cursor < DAY_END_MIN) {
      slots.push({ dayIndex, startMin: cursor, endMin: DAY_END_MIN });
    }
  }

  return slots;
}
