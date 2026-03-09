import Google from "@auth/core/providers/google";
import { Phone } from "@convex-dev/auth/providers/Phone";
import { convexAuth } from "@convex-dev/auth/server";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").trim() || phone.trim();
}

async function upsertGoogleAccount(
  ctx: MutationCtx,
  userId: Id<"users">,
  profile: Record<string, unknown>,
) {
  const googleAccountId = profile.googleAccountId as string | undefined;
  const googleAccessToken = profile.googleAccessToken as string | undefined;
  const googleRefreshToken = profile.googleRefreshToken as string | undefined;
  if (!googleAccountId || !googleAccessToken || !googleRefreshToken) {
    return;
  }
  const existing = await ctx.db
    .query("googleAccounts")
    .withIndex("by_googleAccountId", (q) =>
      q.eq("googleAccountId", googleAccountId)
    )
    .first();
  const expiresAt =
    typeof profile.googleTokenExpiresAt === "number"
      ? profile.googleTokenExpiresAt
      : Math.floor(Date.now() / 1000) + 3600;
  if (existing) {
    await ctx.db.patch(existing._id, {
      accessToken: googleAccessToken,
      refreshToken: googleRefreshToken,
      expiresAt,
    });
  } else {
    const newAccountId = await ctx.db.insert("googleAccounts", {
      userId,
      googleAccountId,
      email: (profile.googleEmail as string) ?? "",
      accessToken: googleAccessToken,
      refreshToken: googleRefreshToken,
      expiresAt,
    });
    const user = await ctx.db.get(userId);
    if (user && !user.primaryGoogleAccountId) {
      await ctx.db.patch(userId, { primaryGoogleAccountId: newAccountId });
    }
  }
}

async function resolveSessionUserId(
  ctx: MutationCtx,
): Promise<Id<"users"> | null> {
  const verifiers = await ctx.db
    .query("authVerifiers")
    .order("desc")
    .collect();
  for (const v of verifiers) {
    if (v.sessionId) {
      const session = await ctx.db.get(v.sessionId);
      if (session) return session.userId;
    }
  }
  return null;
}

const isPhoneOtpBypassEnabled = process.env.AUTH_PHONE_SMS_BYPASS !== "false";
const devPhoneOtpCode = process.env.AUTH_PHONE_TEST_CODE ?? "000000";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
        },
      },
      profile(googleProfile, tokens) {
        return {
          id: googleProfile.sub,
          name: googleProfile.name ?? null,
          googleAccountId: googleProfile.sub,
          googleEmail: googleProfile.email ?? "",
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token ?? "",
          googleTokenExpiresAt: tokens.expires_at ?? 0,
        };
      },
    }),
    Phone({
      maxAge: 60 * 20,
      async generateVerificationToken() {
        if (isPhoneOtpBypassEnabled) {
          return devPhoneOtpCode;
        }
        return Array.from({ length: 6 }, () =>
          Math.floor(Math.random() * 10)
        ).join("");
      },
      async sendVerificationRequest({ identifier: phone, token }) {
        if (!phone) {
          throw new Error("Phone number is required for phone sign-in");
        }
        if (isPhoneOtpBypassEnabled) {
          // Temporary dev bypass: keep Convex OTP verification flow,
          // but expose the generated token in logs instead of sending SMS.
          console.log("[Auth][Phone OTP] SMS bypass active", { phone, token });
          return;
        }
        throw new Error("Phone SMS delivery is disabled and no provider is configured.");
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(
      ctx: MutationCtx,
      args: {
        existingUserId: Id<"users"> | null;
        type: string;
        profile: Record<string, unknown> & {
          email?: string;
          phone?: string;
          emailVerified?: boolean;
          phoneVerified?: boolean;
          name?: string;
        };
      }
    ): Promise<Id<"users">> {
      const { existingUserId, profile } = args;
      const isOAuth = args.type === "oauth";

      if (existingUserId) {
        if (!isOAuth && typeof profile.phone === "string") {
          await ctx.db.patch(existingUserId, {
            phone: normalizePhone(profile.phone),
            phoneVerificationTime: Date.now(),
          });
        }
        if (isOAuth) {
          const sessionUserId = await resolveSessionUserId(ctx);
          if (sessionUserId && sessionUserId !== existingUserId) {
            throw new Error(
              "This Google account is already linked to another user"
            );
          }
          await upsertGoogleAccount(ctx, existingUserId, profile);
        }
        return existingUserId;
      }

      if (isOAuth) {
        const sessionUserId = await resolveSessionUserId(ctx);
        if (!sessionUserId) {
          throw new Error(
            "Phone verification required before linking other accounts"
          );
        }
        await upsertGoogleAccount(ctx, sessionUserId, profile);
        return sessionUserId;
      }

      const normalizedPhone =
        typeof profile.phone === "string"
          ? normalizePhone(profile.phone)
          : undefined;

      if (!normalizedPhone) {
        throw new Error("Phone number is required for initial sign-in");
      }

      const existing = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", normalizedPhone))
        .filter((q) => q.neq(q.field("phoneVerificationTime"), undefined))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          phone: normalizedPhone,
          phoneVerificationTime: Date.now(),
        });
        return existing._id;
      }

      return await ctx.db.insert("users", {
        phone: normalizedPhone,
        phoneVerificationTime: Date.now(),
        isOnboarded: false,
      });
    },
  },
});
