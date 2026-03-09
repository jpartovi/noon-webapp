"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [
  { label: "30min", value: 30 },
  { label: "1hr", value: 60 },
  { label: "2hr", value: 120 },
] as const;

interface FriendPickerPanelProps {
  selectedFriendIds: Set<string>;
  onToggleFriend: (friendId: Id<"users">) => void;
  minDuration: number;
  onMinDurationChange: (minutes: number) => void;
}

export function FriendPickerPanel({
  selectedFriendIds,
  onToggleFriend,
  minDuration,
  onMinDurationChange,
}: FriendPickerPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined,
  );
  const friends = useQuery(api.friends.listFriends);

  const measureHeight = useCallback(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, []);

  useEffect(() => {
    measureHeight();
  }, [friends, selectedFriendIds, measureHeight]);

  return (
    <div className="border-t bg-background shrink-0">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-center px-4 py-1.5 hover:bg-muted/50 transition-colors"
      >
        <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? (contentHeight ?? 1000) : 0,
        }}
      >
        <div className="flex justify-center gap-1.5 px-4 pb-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onMinDurationChange(opt.value)}
              className={cn(
                "rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
                minDuration === opt.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <FriendCards
          friends={friends}
          selectedFriendIds={selectedFriendIds}
          onToggleFriend={onToggleFriend}
        />
      </div>
    </div>
  );
}

type Friend = {
  _id: string;
  friendId: Id<"users">;
  friendFirstName: string | null;
  friendLastName: string | null;
  friendName: string;
};

function FriendCards({
  friends,
  selectedFriendIds,
  onToggleFriend,
}: {
  friends: Friend[] | undefined;
  selectedFriendIds: Set<string>;
  onToggleFriend: (friendId: Id<"users">) => void;
}) {
  const sorted = useMemo(() => {
    if (!friends) return undefined;
    return [...friends].sort((a, b) => {
      const aSelected = selectedFriendIds.has(a.friendId) ? 0 : 1;
      const bSelected = selectedFriendIds.has(b.friendId) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [friends, selectedFriendIds]);

  if (sorted === undefined) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Loading friends...
      </p>
    );
  }

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center px-4">
        No friends yet. Add friends to find free time together.
      </p>
    );
  }

  return (
    <div className="px-4 pb-3 overflow-y-auto max-h-[40vh]">
      <div className="flex flex-wrap gap-2">
        {sorted.map((f) => {
          const isSelected = selectedFriendIds.has(f.friendId);
          const initials =
            (f.friendFirstName?.[0] ?? "") + (f.friendLastName?.[0] ?? "");
          return (
            <button
              key={f._id}
              onClick={() => onToggleFriend(f.friendId)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                isSelected
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  isSelected
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {initials || "?"}
              </div>
              <span className="text-sm font-medium whitespace-nowrap">
                {f.friendName || "Unknown"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
