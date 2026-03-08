import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").trim() || phone.trim();
}

function orderedPair(a: Id<"users">, b: Id<"users">): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}

export const sendFriendRequest = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const normalized = normalizePhone(args.phone);
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .first();

    if (!targetUser) {
      return { success: false, error: "No user found with that phone number" };
    }
    if (targetUser._id === userId) {
      return { success: false, error: "You cannot add yourself" };
    }

    const [userId1, userId2] = orderedPair(userId, targetUser._id);
    const existing = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", userId1).eq("userId2", userId2)
      )
      .first();

    if (existing) {
      if (existing.status === "pending") {
        return {
          success: false,
          error:
            existing.initiatedBy === userId
              ? "Request already sent"
              : "You already have a pending request from this person",
        };
      }
      if (existing.status === "accepted") {
        return { success: false, error: "Already friends" };
      }
      if (existing.status === "rejected") {
        return { success: false, error: "Previous request was declined" };
      }
    }

    await ctx.db.insert("friendships", {
      userId1,
      userId2,
      status: "pending",
      initiatedBy: userId,
    });
    return { success: true };
  },
});

export const respondToFriendRequest = mutation({
  args: {
    friendshipId: v.id("friendships"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) throw new Error("Friendship not found");
    if (friendship.status !== "pending")
      throw new Error("Request already responded to");
    const otherId = friendship.userId1 === userId ? friendship.userId2 : friendship.userId1;
    if (friendship.initiatedBy === userId)
      throw new Error("You cannot respond to your own request");

    await ctx.db.patch(args.friendshipId, {
      status: args.accept ? "accepted" : "rejected",
    });
    return { success: true };
  },
});

export const removeFriend = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) throw new Error("Friendship not found");
    if (friendship.userId1 !== userId && friendship.userId2 !== userId)
      throw new Error("Not part of this friendship");

    await ctx.db.delete(args.friendshipId);
    return { success: true };
  },
});

export const listInboundRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const asUser1 = await ctx.db
      .query("friendships")
      .withIndex("by_userId1", (q) =>
        q.eq("userId1", userId).eq("status", "pending")
      )
      .filter((q) => q.neq(q.field("initiatedBy"), userId))
      .collect();
    const asUser2 = await ctx.db
      .query("friendships")
      .withIndex("by_userId2", (q) =>
        q.eq("userId2", userId).eq("status", "pending")
      )
      .filter((q) => q.neq(q.field("initiatedBy"), userId))
      .collect();

    const ids = [...asUser1, ...asUser2];
    const withInitiator = await Promise.all(
      ids.map(async (f) => {
        const initiator = await ctx.db.get(f.initiatedBy);
        return {
          _id: f._id,
          _creationTime: f._creationTime,
          status: f.status,
          initiatedBy: f.initiatedBy,
          initiatorFirstName: initiator?.firstName ?? null,
          initiatorLastName: initiator?.lastName ?? null,
          initiatorName: `${initiator?.firstName ?? ""} ${initiator?.lastName ?? ""}`.trim(),
        };
      })
    );
    return withInitiator;
  },
});

export const listFriends = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const asUser1 = await ctx.db
      .query("friendships")
      .withIndex("by_userId1", (q) =>
        q.eq("userId1", userId).eq("status", "accepted")
      )
      .collect();
    const asUser2 = await ctx.db
      .query("friendships")
      .withIndex("by_userId2", (q) =>
        q.eq("userId2", userId).eq("status", "accepted")
      )
      .collect();

    const friendships = [...asUser1, ...asUser2];
    const withFriend = await Promise.all(
      friendships.map(async (f) => {
        const friendId = f.userId1 === userId ? f.userId2 : f.userId1;
        const friend = await ctx.db.get(friendId);
        return {
          _id: f._id,
          _creationTime: f._creationTime,
          friendId,
          friendFirstName: friend?.firstName ?? null,
          friendLastName: friend?.lastName ?? null,
          friendName: `${friend?.firstName ?? ""} ${friend?.lastName ?? ""}`.trim(),
        };
      })
    );
    return withFriend;
  },
});
