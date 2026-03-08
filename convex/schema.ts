import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isOnboarded: v.boolean(),
  })
    .index("by_phone", ["phone"]),

  googleAccounts: defineTable({
    userId: v.id("users"),
    googleAccountId: v.string(),
    email: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_googleAccountId", ["googleAccountId"]),

  calendars: defineTable({
    userId: v.id("users"),
    googleAccountId: v.id("googleAccounts"),
    googleCalendarId: v.string(),
    name: v.string(),
    color: v.string(),
    isHidden: v.boolean(),
  })
    .index("by_googleAccountId", ["googleAccountId"])
    .index("by_userId", ["userId"]),

  friendships: defineTable({
    userId1: v.id("users"),
    userId2: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    initiatedBy: v.id("users"),
  })
    .index("by_userId1", ["userId1", "status"])
    .index("by_userId2", ["userId2", "status"])
    .index("by_pair", ["userId1", "userId2"]),
});
