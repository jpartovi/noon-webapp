import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    return user;
  },
});

export const listMyGoogleAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("googleAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const setPrimaryGoogleAccount = mutation({
  args: { accountId: v.id("googleAccounts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== userId) {
      throw new Error("Account not found");
    }
    await ctx.db.patch(userId, { primaryGoogleAccountId: args.accountId });
  },
});

export const removeGoogleAccount = mutation({
  args: { accountId: v.id("googleAccounts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== userId) {
      throw new Error("Account not found");
    }

    const user = await ctx.db.get(userId);
    if (user?.primaryGoogleAccountId === args.accountId) {
      throw new Error(
        "Cannot remove your primary account. Switch primary to another account first.",
      );
    }

    const allAccounts = await ctx.db
      .query("googleAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (allAccounts.length <= 1) {
      throw new Error("You must keep at least one connected Google account");
    }

    await ctx.db.delete(args.accountId);
  },
});

export const listCalendarsForAccount = query({
  args: { accountId: v.id("googleAccounts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== userId) return [];
    return await ctx.db
      .query("calendars")
      .withIndex("by_googleAccountId", (q) =>
        q.eq("googleAccountId", args.accountId),
      )
      .collect();
  },
});

export const setCalendarVisibility = mutation({
  args: {
    calendarId: v.id("calendars"),
    isHidden: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const calendar = await ctx.db.get(args.calendarId);
    if (!calendar || calendar.userId !== userId) {
      throw new Error("Calendar not found");
    }
    await ctx.db.patch(args.calendarId, { isHidden: args.isHidden });
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    isOnboarded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const updates: {
      firstName?: string;
      lastName?: string;
      isOnboarded?: boolean;
    } = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.isOnboarded !== undefined) updates.isOnboarded = args.isOnboarded;
    if (Object.keys(updates).length === 0) return userId;
    await ctx.db.patch(userId, updates);
    return userId;
  },
});
