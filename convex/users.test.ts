import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { TestConvex } from "convex-test";

describe("User Management", () => {
  let t: TestConvex<typeof schema>;
  const userSubject = "user_test_123";

  beforeEach(async () => {
    // Create fresh test environment for each test
    t = convexTest(schema, import.meta.glob("./**/*.ts"));
  });

  describe("getOrCreateUser", () => {
    test("creates new user with default settings", async () => {
      const userId = await t
        .withIdentity({ subject: userSubject, name: "Test User" })
        .mutation(api.users.getOrCreateUser, {});

      // Verify user was created
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user).toBeDefined();
      expect(user?.clerkUserId).toBe(userSubject);
      expect(user?.timezone).toBeUndefined();
      expect(user?.dailyReportsEnabled).toBe(true); // Enabled for all users (paywall later)
      expect(user?.weeklyReportsEnabled).toBe(true);
      expect(user?.monthlyReportsEnabled).toBe(false);
      expect(user?.createdAt).toBeTypeOf("number");
      expect(user?.updatedAt).toBeTypeOf("number");
    });

    test("creates new user with timezone", async () => {
      const userId = await t
        .withIdentity({ subject: userSubject, name: "Test User" })
        .mutation(api.users.getOrCreateUser, {
          timezone: "America/New_York",
        });

      // Verify user was created with timezone
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.timezone).toBe("America/New_York");
    });

    test("returns existing user if already exists", async () => {
      // Create user first time
      const userId1 = await t
        .withIdentity({ subject: userSubject, name: "Test User" })
        .mutation(api.users.getOrCreateUser, {});

      // Try to create again - should return same ID
      const userId2 = await t
        .withIdentity({ subject: userSubject, name: "Test User" })
        .mutation(api.users.getOrCreateUser, {});

      expect(userId1).toBe(userId2);

      // Verify only one user exists
      const allUsers = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userSubject))
          .collect();
      });

      expect(allUsers.length).toBe(1);
    });

    test("throws error for unauthenticated requests", async () => {
      await expect(t.mutation(api.users.getOrCreateUser, {})).rejects.toThrow(
        "Unauthorized"
      );
    });
  });

  describe("updateUserTimezone", () => {
    test("updates timezone for existing user", async () => {
      // Create user
      const userId = await t
        .withIdentity({ subject: userSubject, name: "Test User" })
        .mutation(api.users.getOrCreateUser, {});

      // Get original updatedAt
      const originalUser = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      // Update timezone
      await t
        .withIdentity({ subject: userSubject, name: "Test User" })
        .mutation(api.users.updateUserTimezone, {
          timezone: "America/Los_Angeles",
        });

      // Verify timezone was updated
      const updatedUser = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(updatedUser?.timezone).toBe("America/Los_Angeles");
      // updatedAt should be >= original (can be equal if mutation is fast)
      expect(updatedUser?.updatedAt).toBeGreaterThanOrEqual(
        originalUser?.updatedAt || 0
      );
    });

    test("creates user if doesn't exist", async () => {
      // Update timezone for non-existent user
      await t
        .withIdentity({ subject: userSubject, name: "Test User" })
        .mutation(api.users.updateUserTimezone, {
          timezone: "Europe/London",
        });

      // Verify user was created
      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userSubject))
          .first();
      });

      expect(user).toBeDefined();
      expect(user?.timezone).toBe("Europe/London");
      expect(user?.weeklyReportsEnabled).toBe(true);
    });

    test("silently returns for unauthenticated requests", async () => {
      // Should return early without throwing (defensive programming for auth loading state)
      const result = await t.mutation(api.users.updateUserTimezone, {
        timezone: "America/New_York",
      });

      // Mutation should complete without error (returns null for early return)
      expect(result).toBeNull();
    });
  });

  describe("getSubscriptionStatus", () => {
    const dayMs = 24 * 60 * 60 * 1000;

    async function seedUserWithStatus({
      clerkUserId,
      subscriptionStatus,
      trialEndsAt,
      subscriptionPeriodEnd,
    }: {
      clerkUserId: string;
      subscriptionStatus: "trial" | "active" | "past_due" | "canceled" | "expired";
      trialEndsAt?: number;
      subscriptionPeriodEnd?: number;
    }) {
      const now = Date.now();
      await t.run(async (ctx) => {
        await ctx.db.insert("users", {
          clerkUserId,
          subscriptionStatus,
          trialEndsAt,
          subscriptionPeriodEnd,
          createdAt: now,
          updatedAt: now,
        });
      });
    }

    test("returns null for unauthenticated requests", async () => {
      const result = await t.query(api.users.getSubscriptionStatus, {});
      expect(result).toBeNull();
    });

    test("grants access for active subscriptions", async () => {
      const clerkUserId = "user_active";
      await seedUserWithStatus({
        clerkUserId,
        subscriptionStatus: "active",
      });

      const result = await t
        .withIdentity({ subject: clerkUserId })
        .query(api.users.getSubscriptionStatus, {});

      expect(result?.hasAccess).toBe(true);
      expect(result?.status).toBe("active");
    });

    test("grants access for past_due subscriptions", async () => {
      const clerkUserId = "user_past_due";
      await seedUserWithStatus({
        clerkUserId,
        subscriptionStatus: "past_due",
      });

      const result = await t
        .withIdentity({ subject: clerkUserId })
        .query(api.users.getSubscriptionStatus, {});

      expect(result?.hasAccess).toBe(true);
      expect(result?.status).toBe("past_due");
    });

    test("grants access for canceled subscriptions before period end", async () => {
      const clerkUserId = "user_canceled";
      const periodEnd = Date.now() + 2 * dayMs;
      await seedUserWithStatus({
        clerkUserId,
        subscriptionStatus: "canceled",
        subscriptionPeriodEnd: periodEnd,
      });

      const result = await t
        .withIdentity({ subject: clerkUserId })
        .query(api.users.getSubscriptionStatus, {});

      expect(result?.hasAccess).toBe(true);
      expect(result?.subscriptionPeriodEnd).toBe(periodEnd);
    });

    test("denies access for expired trial", async () => {
      const clerkUserId = "user_trial_expired";
      await seedUserWithStatus({
        clerkUserId,
        subscriptionStatus: "trial",
        trialEndsAt: Date.now() - dayMs,
      });

      const result = await t
        .withIdentity({ subject: clerkUserId })
        .query(api.users.getSubscriptionStatus, {});

      expect(result?.hasAccess).toBe(false);
      expect(result?.status).toBe("trial");
    });
  });

  describe("data isolation", () => {
    test("users are isolated by clerkUserId", async () => {
      const user1Subject = "user_1";
      const user2Subject = "user_2";

      // Create two users
      const userId1 = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.users.getOrCreateUser, {});

      const userId2 = await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .mutation(api.users.getOrCreateUser, {});

      // Verify they have different IDs
      expect(userId1).not.toBe(userId2);

      // Update user 1's timezone
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.users.updateUserTimezone, {
          timezone: "America/New_York",
        });

      // Verify user 2's timezone is unaffected
      const user2 = await t.run(async (ctx) => {
        return await ctx.db.get(userId2);
      });

      expect(user2?.timezone).toBeUndefined();
    });
  });
});
