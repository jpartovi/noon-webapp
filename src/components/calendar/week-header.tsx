"use client";

import { format, isSameDay, addDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WeekHeaderProps {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export function WeekHeader({
  weekStart,
  onPrevWeek,
  onNextWeek,
  onToday,
}: WeekHeaderProps) {
  const today = new Date();
  const weekEnd = addDays(weekStart, 6);

  const sameMonth =
    weekStart.getMonth() === weekEnd.getMonth() &&
    weekStart.getFullYear() === weekEnd.getFullYear();

  const dateRange = sameMonth
    ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "d, yyyy")}`
    : weekStart.getFullYear() === weekEnd.getFullYear()
      ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
      : `${format(weekStart, "MMM d, yyyy")} – ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onPrevWeek}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">{dateRange}</h2>
        </div>
      </div>

      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div />
        {Array.from({ length: 7 }, (_, i) => {
          const day = addDays(weekStart, i);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center py-2 text-center border-l border-border",
                isToday && "bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
