"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { startOfWeek, addWeeks, addDays, startOfDay } from "date-fns";
import { useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { WeekHeader } from "./week-header";
import { AllDayRow } from "./all-day-row";
import { TimeGrid } from "./time-grid";
import type { CalendarEvent } from "./types";

export function WeekCalendar() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCalendarEvents = useAction(api.calendar.getCalendarEvents);
  const fetchIdRef = useRef(0);

  const fetchEvents = useCallback(
    async (start: Date) => {
      const id = ++fetchIdRef.current;
      setLoading(true);
      setError(null);

      const timeMin = startOfDay(start).toISOString();
      const timeMax = startOfDay(addDays(start, 7)).toISOString();

      try {
        const result = await getCalendarEvents({ timeMin, timeMax });
        if (fetchIdRef.current === id) {
          setEvents(result);
          setLoading(false);
        }
      } catch (e) {
        if (fetchIdRef.current === id) {
          console.error("Failed to fetch calendar events:", e);
          setError("Failed to load calendar events");
          setLoading(false);
        }
      }
    },
    [getCalendarEvents],
  );

  useEffect(() => {
    fetchEvents(weekStart);
  }, [weekStart, fetchEvents]);

  const timedEvents = events.filter((e) => !e.isAllDay);
  const allDayEvents = events.filter((e) => e.isAllDay);

  const goToday = useCallback(() => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  }, []);

  const goPrev = useCallback(() => {
    setWeekStart((prev) => addWeeks(prev, -1));
  }, []);

  const goNext = useCallback(() => {
    setWeekStart((prev) => addWeeks(prev, 1));
  }, []);

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goPrev();
        else goNext();
      }
    },
    [goPrev, goNext],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext]);

  return (
    <div
      className="flex flex-col h-full bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <WeekHeader
        weekStart={weekStart}
        onPrevWeek={goPrev}
        onNextWeek={goNext}
        onToday={goToday}
      />
      <AllDayRow weekStart={weekStart} events={allDayEvents} />

      {loading && events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading events...</p>
          </div>
        </div>
      ) : error && events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <TimeGrid weekStart={weekStart} events={timedEvents} />
      )}
    </div>
  );
}
