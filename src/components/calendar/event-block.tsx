"use client";

import { cn } from "@/lib/utils";
import type { PositionedEvent } from "./types";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace("#", "").match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function darkenColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#37352f";
  return `rgb(${Math.round(rgb.r * 0.35)}, ${Math.round(rgb.g * 0.35)}, ${Math.round(rgb.b * 0.35)})`;
}

function tintColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#f5f5f5";
  const r = Math.round(rgb.r + (255 - rgb.r) * (1 - amount));
  const g = Math.round(rgb.g + (255 - rgb.g) * (1 - amount));
  const b = Math.round(rgb.b + (255 - rgb.b) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

const STAGGER_PX = 18;

interface EventBlockProps {
  event: PositionedEvent;
  startMinutes: number;
  endMinutes: number;
  hourHeight: number;
}

export function EventBlock({
  event,
  startMinutes,
  endMinutes,
  hourHeight,
}: EventBlockProps) {
  const top = (startMinutes / 60) * hourHeight;
  const height = Math.max(((endMinutes - startMinutes) / 60) * hourHeight, hourHeight / 3);
  const isShort = endMinutes - startMinutes <= 30;

  const bgColor = tintColor(event.calendarColor, 0.14);
  const borderColor = tintColor(event.calendarColor, 0.25);
  const textColor = darkenColor(event.calendarColor);

  const startTime = new Date(event.start);
  const timeStr = startTime.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const leftPx = event.column * STAGGER_PX;
  const shrinkPx = (event.totalColumns - 1) * STAGGER_PX + 12;

  return (
    <div
      className={cn(
        "absolute overflow-hidden rounded-[4px] px-[7px] py-[3px] text-xs leading-tight cursor-pointer",
        "border-l-[3px] transition-[filter] hover:brightness-95",
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `calc(${leftPx}px + 2px)`,
        width: `calc(100% - ${shrinkPx}px)`,
        zIndex: 10 + event.column,
        backgroundColor: bgColor,
        borderLeftColor: event.calendarColor,
        borderTop: `1px solid ${borderColor}`,
        borderRight: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
        color: textColor,
      }}
      title={`${event.title}\n${event.calendarName}`}
    >
      <div className="font-semibold truncate leading-[1.35]">{event.title}</div>
      {!isShort && (
        <div className="truncate opacity-70 mt-px">{timeStr}</div>
      )}
    </div>
  );
}

interface AllDayEventBlockProps {
  event: CalendarEventBasic;
  color: string;
}

interface CalendarEventBasic {
  id: string;
  title: string;
  calendarColor: string;
  calendarName: string;
}

export function AllDayEventBlock({ event }: AllDayEventBlockProps) {
  const bgColor = tintColor(event.calendarColor, 0.14);
  const textColor = darkenColor(event.calendarColor);

  return (
    <div
      className="rounded-[4px] border-l-[3px] px-[7px] py-0.5 text-xs font-semibold truncate cursor-pointer transition-[filter] hover:brightness-95"
      style={{
        backgroundColor: bgColor,
        borderLeftColor: event.calendarColor,
        color: textColor,
      }}
      title={`${event.title}\n${event.calendarName}`}
    >
      {event.title}
    </div>
  );
}
