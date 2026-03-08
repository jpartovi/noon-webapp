"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
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

export default function CalendarAccountsPage(
  _props: { params: Promise<unknown>; searchParams: Promise<unknown> },
) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const user = useQuery(api.users.getMe);
  const googleAccounts = useQuery(api.users.listMyGoogleAccounts);
  const removeAccount = useMutation(api.users.removeGoogleAccount);

  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<Id<"googleAccounts"> | null>(
    null,
  );
  const [expandedId, setExpandedId] = useState<Id<"googleAccounts"> | null>(
    null,
  );

  if (user === undefined || googleAccounts === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user === null) {
    router.replace("/sign-in");
    return null;
  }

  const canRemove = (googleAccounts?.length ?? 0) > 1;

  const handleConnect = () => {
    setError(null);
    void signIn("google", { params: { redirectTo: "/calendar-accounts" } })
      .then((result) => {
        if (result.redirect)
          window.location.href = result.redirect.toString();
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to connect Google account. Please try again.",
        );
      });
  };

  const handleRemove = async (accountId: Id<"googleAccounts">) => {
    setError(null);
    setRemovingId(accountId);
    try {
      await removeAccount({ accountId });
      if (expandedId === accountId) setExpandedId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove account",
      );
    } finally {
      setRemovingId(null);
    }
  };

  const toggleExpand = (id: Id<"googleAccounts">) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <h1 className="text-xl font-semibold tracking-tight">Calendar Accounts</h1>

        {error && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-foreground">
            Connected accounts
          </h2>
          {googleAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <ul className="space-y-2">
              {googleAccounts.map((acct) => {
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
                        <p className="truncate text-sm font-medium text-foreground">
                          {acct.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={!canRemove || removingId === acct._id}
                        onClick={() => handleRemove(acct._id)}
                        title={
                          canRemove
                            ? "Remove account"
                            : "You must keep at least one account"
                        }
                      >
                        <Trash2 className="size-4" />
                        {removingId === acct._id ? "Removing…" : "Remove"}
                      </Button>
                    </div>
                    {isExpanded && (
                      <AccountCalendars accountId={acct._id} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Button variant="outline" className="w-full" onClick={handleConnect}>
          Connect Google account
        </Button>
      </main>
    </div>
  );
}
