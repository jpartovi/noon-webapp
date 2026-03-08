"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}

interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  backgroundColor: string;
  foregroundColor: string;
  selected?: boolean;
  primary?: boolean;
}

interface GoogleEventTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  start: GoogleEventTime;
  end: GoogleEventTime;
  status?: string;
  colorId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  calendarName: string;
  calendarColor: string;
  googleAccountEmail: string;
}

async function fetchCalendarList(
  accessToken: string,
): Promise<GoogleCalendarListEntry[]> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?" +
      new URLSearchParams({ minAccessRole: "reader" }),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar list fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.items ?? [];
}

async function fetchEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    if (res.status === 404 || res.status === 410) return [];
    const text = await res.text();
    throw new Error(
      `Events fetch failed for ${calendarId}: ${res.status} ${text}`,
    );
  }
  const data = await res.json();
  return data.items ?? [];
}

export const syncCalendars = action({
  args: { accountId: v.id("googleAccounts") },
  handler: async (ctx, args) => {
    const accounts = await ctx.runQuery(
      internal.calendarHelpers.getGoogleAccountsForCurrentUser,
    );
    const account = accounts.find((a) => a._id === args.accountId);
    if (!account) throw new Error("Account not found");

    let accessToken = account.accessToken;
    const nowSec = Math.floor(Date.now() / 1000);

    if (account.expiresAt < nowSec + 60) {
      const refreshed = await refreshAccessToken(account.refreshToken);
      accessToken = refreshed.access_token;
      const newExpiry = nowSec + refreshed.expires_in;
      await ctx.runMutation(internal.calendarHelpers.updateTokens, {
        accountId: account._id,
        accessToken,
        expiresAt: newExpiry,
      });
    }

    const calendars = await fetchCalendarList(accessToken);

    await ctx.runMutation(internal.calendarHelpers.upsertCalendars, {
      accountId: account._id,
      userId: account.userId,
      googleCalendars: calendars.map((cal) => ({
        googleCalendarId: cal.id,
        name: cal.summary,
        color: cal.backgroundColor,
      })),
    });
  },
});

export const getCalendarEvents = action({
  args: {
    timeMin: v.string(),
    timeMax: v.string(),
  },
  handler: async (ctx, args): Promise<CalendarEvent[]> => {
    const accounts = await ctx.runQuery(
      internal.calendarHelpers.getGoogleAccountsForCurrentUser,
    );

    if (accounts.length === 0) return [];

    const nowSec = Math.floor(Date.now() / 1000);

    // Phase 1: Refresh tokens & fetch calendar lists in parallel across accounts
    const accountResults = await Promise.allSettled(
      accounts.map(async (account) => {
        let accessToken = account.accessToken;

        if (account.expiresAt < nowSec + 60) {
          const refreshed = await refreshAccessToken(account.refreshToken);
          accessToken = refreshed.access_token;
          const newExpiry = nowSec + refreshed.expires_in;
          await ctx.runMutation(internal.calendarHelpers.updateTokens, {
            accountId: account._id,
            accessToken,
            expiresAt: newExpiry,
          });
        }

        const calendars = await fetchCalendarList(accessToken);
        return { account, accessToken, calendars };
      }),
    );

    // Phase 2: Fetch events from all calendars across all accounts in parallel
    const eventFetches: Promise<CalendarEvent[]>[] = [];

    for (const result of accountResults) {
      if (result.status === "rejected") {
        console.error("Failed to load account calendars:", result.reason);
        continue;
      }
      const { account, accessToken, calendars } = result.value;

      const storedCalendars = await ctx.runQuery(
        internal.calendarHelpers.getCalendarsForAccount,
        { accountId: account._id },
      );
      const hiddenIds = new Set(
        storedCalendars
          .filter((c) => c.isHidden)
          .map((c) => c.googleCalendarId),
      );

      for (const cal of calendars) {
        if (cal.selected === false) continue;
        if (hiddenIds.has(cal.id)) continue;

        eventFetches.push(
          fetchEvents(accessToken, cal.id, args.timeMin, args.timeMax)
            .then((events) =>
              events
                .filter((e) => e.status !== "cancelled")
                .map((event) => {
                  const isAllDay = !event.start.dateTime;
                  return {
                    id: `${account._id}_${event.id}`,
                    title: event.summary ?? "(No title)",
                    start: event.start.dateTime ?? event.start.date ?? "",
                    end: event.end.dateTime ?? event.end.date ?? "",
                    isAllDay,
                    calendarName: cal.summary,
                    calendarColor: cal.backgroundColor,
                    googleAccountEmail: account.email,
                  };
                }),
            )
            .catch((e) => {
              console.error(`Failed to fetch events for calendar ${cal.summary}:`, e);
              return [] as CalendarEvent[];
            }),
        );
      }
    }

    const eventArrays = await Promise.all(eventFetches);
    const allEvents = eventArrays.flat();
    allEvents.sort((a, b) => a.start.localeCompare(b.start));
    return allEvents;
  },
});
