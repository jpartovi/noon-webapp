import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getGoogleAccountsForCurrentUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("googleAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const updateTokens = internalMutation({
  args: {
    accountId: v.id("googleAccounts"),
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, {
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
    });
  },
});

export const getCalendarsForAccount = internalQuery({
  args: { accountId: v.id("googleAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("calendars")
      .withIndex("by_googleAccountId", (q) =>
        q.eq("googleAccountId", args.accountId),
      )
      .collect();
  },
});

export const upsertCalendars = internalMutation({
  args: {
    accountId: v.id("googleAccounts"),
    userId: v.id("users"),
    googleCalendars: v.array(
      v.object({
        googleCalendarId: v.string(),
        name: v.string(),
        color: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("calendars")
      .withIndex("by_googleAccountId", (q) =>
        q.eq("googleAccountId", args.accountId),
      )
      .collect();

    const existingByGoogleId = new Map(
      existing.map((c) => [c.googleCalendarId, c]),
    );
    const incomingIds = new Set(
      args.googleCalendars.map((c) => c.googleCalendarId),
    );

    for (const cal of args.googleCalendars) {
      const match = existingByGoogleId.get(cal.googleCalendarId);
      if (match) {
        if (match.name !== cal.name || match.color !== cal.color) {
          await ctx.db.patch(match._id, {
            name: cal.name,
            color: cal.color,
          });
        }
      } else {
        await ctx.db.insert("calendars", {
          userId: args.userId,
          googleAccountId: args.accountId,
          googleCalendarId: cal.googleCalendarId,
          name: cal.name,
          color: cal.color,
          isHidden: false,
        });
      }
    }

    for (const row of existing) {
      if (!incomingIds.has(row.googleCalendarId)) {
        await ctx.db.delete(row._id);
      }
    }
  },
});
