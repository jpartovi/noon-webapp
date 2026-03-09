"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

function AccountCalendars({ accountId }: { accountId: Id<"googleAccounts"> }) {
  const calendars = useQuery(api.users.listCalendarsForAccount, { accountId });
  const setVisibility = useMutation(api.users.setCalendarVisibility);
  const syncCalendars = useAction(api.calendar.syncCalendars);
  const [syncing, setSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    if (syncing || hasSynced) return;
    setSyncing(true);
    syncCalendars({ accountId })
      .then(() => setHasSynced(true))
      .catch((e) => console.error("Failed to sync calendars:", e))
      .finally(() => setSyncing(false));
  }, [syncCalendars, accountId, syncing, hasSynced]);

  const showLoading = calendars === undefined || (!hasSynced && syncing);
  const isEmpty = calendars !== undefined && calendars.length === 0 && !syncing;

  return (
    <div className="border-t border-border px-3 pb-3 pt-2">
      {syncing && (
        <div className="flex items-center gap-2 py-1">
          <div className="size-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">
            Syncing calendars…
          </span>
        </div>
      )}
      {!syncing && isEmpty && hasSynced && (
        <p className="text-xs text-muted-foreground py-1">
          No calendars found for this account.
        </p>
      )}
      {!showLoading && calendars && calendars.length > 0 && (
        <ul className="space-y-1 pt-1">
          {calendars.map((cal) => (
            <li key={cal._id} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={!cal.isHidden}
                onChange={() =>
                  setVisibility({
                    calendarId: cal._id,
                    isHidden: !cal.isHidden,
                  })
                }
                className="size-3.5 rounded border-border accent-primary cursor-pointer"
              />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: cal.color }}
              />
              <span
                className={cn(
                  "text-sm truncate",
                  cal.isHidden
                    ? "text-muted-foreground line-through"
                    : "text-foreground",
                )}
              >
                {cal.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface GoogleAccountListProps {
  googleAccounts: Array<{
    _id: Id<"googleAccounts">;
    email: string;
  }>;
  primaryGoogleAccountId: Id<"googleAccounts"> | undefined;
  onConnect: () => void;
  onRemove: (accountId: Id<"googleAccounts">) => Promise<void>;
  onSetPrimary: (accountId: Id<"googleAccounts">) => Promise<void>;
}

export function GoogleAccountList({
  googleAccounts,
  primaryGoogleAccountId,
  onConnect,
  onRemove,
  onSetPrimary,
}: GoogleAccountListProps) {
  const [removingId, setRemovingId] = useState<Id<"googleAccounts"> | null>(
    null,
  );
  const [settingPrimaryId, setSettingPrimaryId] =
    useState<Id<"googleAccounts"> | null>(null);
  const [expandedId, setExpandedId] = useState<Id<"googleAccounts"> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const canRemove = googleAccounts.length > 1;

  const handleRemove = async (accountId: Id<"googleAccounts">) => {
    setError(null);
    setRemovingId(accountId);
    try {
      await onRemove(accountId);
      if (expandedId === accountId) setExpandedId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove account",
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleSetPrimary = async (accountId: Id<"googleAccounts">) => {
    setError(null);
    setSettingPrimaryId(accountId);
    try {
      await onSetPrimary(accountId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set primary account",
      );
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const toggleExpand = (id: Id<"googleAccounts">) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {googleAccounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No accounts connected yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {googleAccounts.map((acct) => {
            const isPrimary = acct._id === primaryGoogleAccountId;
            const isExpanded = expandedId === acct._id;
            return (
              <li
                key={acct._id}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    onClick={() => toggleExpand(acct._id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => toggleExpand(acct._id)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {acct.email}
                      </p>
                      {isPrimary && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <Star className="size-3 fill-current" />
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  {!isPrimary && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-primary"
                      disabled={settingPrimaryId === acct._id}
                      onClick={() => handleSetPrimary(acct._id)}
                    >
                      <Star className="size-4" />
                      {settingPrimaryId === acct._id
                        ? "Setting…"
                        : "Set primary"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={
                      isPrimary || !canRemove || removingId === acct._id
                    }
                    onClick={() => handleRemove(acct._id)}
                    title={
                      isPrimary
                        ? "Switch primary to another account first"
                        : !canRemove
                          ? "You must keep at least one account"
                          : "Remove account"
                    }
                  >
                    <Trash2 className="size-4" />
                    {removingId === acct._id ? "Removing…" : "Remove"}
                  </Button>
                </div>
                {isExpanded && <AccountCalendars accountId={acct._id} />}
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="outline" className="w-full" onClick={onConnect}>
        Connect Google account
      </Button>
    </div>
  );
}
