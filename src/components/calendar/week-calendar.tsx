"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { startOfWeek, addWeeks, addDays, startOfDay } from "date-fns";
import { useAction } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { WeekHeader } from "./week-header";
import { AllDayRow } from "./all-day-row";
import { TimeGrid } from "./time-grid";
import { FriendPickerPanel } from "./friend-picker-drawer";
import { computeFreeSlots } from "@/lib/free-time";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { CalendarEvent } from "./types";

export function WeekCalendar() {
  const isMobile = useIsMobile();
  const visibleDays = isMobile ? 3 : 7;

  const [viewStart, setViewStart] = useState(() =>
    isMobile
      ? startOfDay(new Date())
      : startOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(
    new Set(),
  );
  const [friendEvents, setFriendEvents] = useState<
    Record<string, CalendarEvent[]>
  >({});
  const [minDuration, setMinDuration] = useState(60);

  const getCalendarEvents = useAction(api.calendar.getCalendarEvents);
  const getFriendsEvents = useAction(api.calendar.getFriendsEvents);
  const fetchIdRef = useRef(0);
  const friendFetchIdRef = useRef(0);

  useEffect(() => {
    setViewStart(
      isMobile
        ? startOfDay(new Date())
        : startOfWeek(new Date(), { weekStartsOn: 0 }),
    );
  }, [isMobile]);

  const fetchEvents = useCallback(
    async (start: Date) => {
      const id = ++fetchIdRef.current;
      setLoading(true);
      setError(null);

      const timeMin = startOfDay(start).toISOString();
      const timeMax = startOfDay(addDays(start, visibleDays)).toISOString();

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
    [getCalendarEvents, visibleDays],
  );

  useEffect(() => {
    fetchEvents(viewStart);
  }, [viewStart, fetchEvents]);

  const fetchFriendEvents = useCallback(
    async (friendIds: string[], start: Date) => {
      if (friendIds.length === 0) {
        setFriendEvents({});
        return;
      }
      const id = ++friendFetchIdRef.current;
      const timeMin = startOfDay(start).toISOString();
      const timeMax = startOfDay(addDays(start, visibleDays)).toISOString();

      try {
        const result = await getFriendsEvents({
          friendIds: friendIds as Id<"users">[],
          timeMin,
          timeMax,
        });
        if (friendFetchIdRef.current === id) {
          setFriendEvents(result);
        }
      } catch (e) {
        console.error("Failed to fetch friend events:", e);
        if (friendFetchIdRef.current === id) {
          setFriendEvents({});
        }
      }
    },
    [getFriendsEvents, visibleDays],
  );

  useEffect(() => {
    fetchFriendEvents(Array.from(selectedFriendIds), viewStart);
  }, [selectedFriendIds, viewStart, fetchFriendEvents]);

  const handleToggleFriend = useCallback((friendId: Id<"users">) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  }, []);

  const timedEvents = events.filter((e) => !e.isAllDay);
  const allDayEvents = events.filter((e) => e.isAllDay);

  const freeTimeSlots = useMemo(() => {
    if (selectedFriendIds.size === 0) return [];
    const all = computeFreeSlots(events, friendEvents, viewStart, visibleDays);
    return all.filter((s) => s.endMin - s.startMin >= minDuration);
  }, [events, friendEvents, viewStart, selectedFriendIds.size, visibleDays, minDuration]);

  const goToday = useCallback(() => {
    setViewStart(
      isMobile
        ? startOfDay(new Date())
        : startOfWeek(new Date(), { weekStartsOn: 0 }),
    );
  }, [isMobile]);

  const goPrev = useCallback(() => {
    setViewStart((prev) =>
      isMobile ? addDays(prev, -3) : addWeeks(prev, -1),
    );
  }, [isMobile]);

  const goNext = useCallback(() => {
    setViewStart((prev) =>
      isMobile ? addDays(prev, 3) : addWeeks(prev, 1),
    );
  }, [isMobile]);

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
      className="flex flex-col flex-1 min-h-0 bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <WeekHeader
        viewStart={viewStart}
        visibleDays={visibleDays}
        onPrevWeek={goPrev}
        onNextWeek={goNext}
        onToday={goToday}
      />
      <AllDayRow viewStart={viewStart} visibleDays={visibleDays} events={allDayEvents} />

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
        <TimeGrid
          viewStart={viewStart}
          visibleDays={visibleDays}
          events={timedEvents}
          freeTimeSlots={freeTimeSlots}
        />
      )}

      <FriendPickerPanel
        selectedFriendIds={selectedFriendIds}
        onToggleFriend={handleToggleFriend}
        minDuration={minDuration}
        onMinDurationChange={setMinDuration}
      />
    </div>
  );
}
