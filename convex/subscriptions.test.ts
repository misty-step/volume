import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import type { TestConvex } from "convex-test";

// Type declaration for Vite's import.meta.glob
declare global {
  interface ImportMeta {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./**/*.ts");

describe("Subscriptions", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function seedUser(overrides?: Partial<{
    clerkUserId: string;
    stripeCustomerId: string;
    subscriptionStatus: "trial" | "active" | "past_due" | "canceled" | "expired";
    subscriptionPeriodEnd: number;
  }>) {
    const now = Date.now();
    const clerkUserId = overrides?.clerkUserId ?? "user_sub_test";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkUserId,
        stripeCustomerId: overrides?.stripeCustomerId,
        subscriptionStatus: overrides?.subscriptionStatus,
        subscriptionPeriodEnd: overrides?.subscriptionPeriodEnd,
        createdAt: now,
        updatedAt: now,
      });
    });
    return { clerkUserId };
  }

  test("handleCheckoutCompleted links customer and activates subscription", async () => {
    const { clerkUserId } = await seedUser();
    const periodEnd = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await t.mutation(internal.subscriptions.handleCheckoutCompleted, {
      clerkUserId,
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      status: "active",
      periodEnd,
      eventId: "evt_test_123",
      eventTimestamp: Math.floor(Date.now() / 1000),
    });

    const user = await t
      .withIdentity({ subject: clerkUserId })
      .query(api.users.getCurrentUser, {});

    expect(user?.stripeCustomerId).toBe("cus_123");
    expect(user?.stripeSubscriptionId).toBe("sub_123");
    expect(user?.subscriptionStatus).toBe("active");
    expect(user?.subscriptionPeriodEnd).toBe(periodEnd);
  });

  test("handleCheckoutCompleted throws when user is missing", async () => {
    await expect(
      t.mutation(internal.subscriptions.handleCheckoutCompleted, {
        clerkUserId: "missing_user",
        stripeCustomerId: "cus_missing",
        stripeSubscriptionId: "sub_missing",
        status: "active",
        periodEnd: Date.now(),
        eventId: "evt_test_missing",
        eventTimestamp: Math.floor(Date.now() / 1000),
      })
    ).rejects.toThrow("No user found");
  });

  test("updateSubscriptionFromStripe updates existing user", async () => {
    await seedUser({
      stripeCustomerId: "cus_update",
      subscriptionStatus: "active",
    });
    const periodEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await t.mutation(internal.subscriptions.updateSubscriptionFromStripe, {
      stripeCustomerId: "cus_update",
      stripeSubscriptionId: "sub_update",
      status: "canceled",
      periodEnd,
      eventId: "evt_test_update",
      eventTimestamp: Math.floor(Date.now() / 1000),
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_stripe_customer", (q) =>
          q.eq("stripeCustomerId", "cus_update")
        )
        .first();
    });

    expect(user?.subscriptionStatus).toBe("canceled");
    expect(user?.subscriptionPeriodEnd).toBe(periodEnd);
    expect(user?.stripeSubscriptionId).toBe("sub_update");
  });

  test("updateSubscriptionFromStripe throws when user is missing", async () => {
    await expect(
      t.mutation(internal.subscriptions.updateSubscriptionFromStripe, {
        stripeCustomerId: "cus_missing",
        stripeSubscriptionId: "sub_missing",
        status: "expired",
        periodEnd: undefined,
        eventId: "evt_test_missing_update",
        eventTimestamp: Math.floor(Date.now() / 1000),
      })
    ).rejects.toThrow("No user found");
  });

  test("getStripeCustomerId returns customer ID for authenticated user", async () => {
    const { clerkUserId } = await seedUser({
      stripeCustomerId: "cus_lookup",
    });

    const customerId = await t
      .withIdentity({ subject: clerkUserId })
      .query(api.subscriptions.getStripeCustomerId, {});

    expect(customerId).toBe("cus_lookup");
  });

  test("getStripeCustomerId returns null when missing", async () => {
    const { clerkUserId } = await seedUser();

    const customerId = await t
      .withIdentity({ subject: clerkUserId })
      .query(api.subscriptions.getStripeCustomerId, {});

    expect(customerId).toBeNull();
  });

  test("handleCheckoutCompleted skips duplicate events", async () => {
    const { clerkUserId } = await seedUser();
    const periodEnd = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const eventId = "evt_duplicate_test";
    const eventTimestamp = Math.floor(Date.now() / 1000);

    // First call - should succeed
    await t.mutation(internal.subscriptions.handleCheckoutCompleted, {
      clerkUserId,
      stripeCustomerId: "cus_dup",
      stripeSubscriptionId: "sub_dup",
      status: "active",
      periodEnd,
      eventId,
      eventTimestamp,
    });

    // Second call with same eventId - should be skipped (idempotent)
    const newPeriodEnd = periodEnd + 1000;
    await t.mutation(internal.subscriptions.handleCheckoutCompleted, {
      clerkUserId,
      stripeCustomerId: "cus_dup",
      stripeSubscriptionId: "sub_dup",
      status: "canceled", // Different status
      periodEnd: newPeriodEnd,
      eventId, // Same event ID
      eventTimestamp,
    });

    // Should still have original values (skipped duplicate)
    const user = await t
      .withIdentity({ subject: clerkUserId })
      .query(api.users.getCurrentUser, {});

    expect(user?.subscriptionStatus).toBe("active"); // Not "canceled"
    expect(user?.subscriptionPeriodEnd).toBe(periodEnd); // Not newPeriodEnd
  });

  test("updateSubscriptionFromStripe skips stale events", async () => {
    await seedUser({
      stripeCustomerId: "cus_stale",
      subscriptionStatus: "active",
    });

    const newerTimestamp = Math.floor(Date.now() / 1000);
    const olderTimestamp = newerTimestamp - 100;

    // First: process newer event
    await t.mutation(internal.subscriptions.updateSubscriptionFromStripe, {
      stripeCustomerId: "cus_stale",
      stripeSubscriptionId: "sub_stale",
      status: "active",
      periodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      eventId: "evt_newer",
      eventTimestamp: newerTimestamp,
    });

    // Second: try to process older event (should be skipped)
    await t.mutation(internal.subscriptions.updateSubscriptionFromStripe, {
      stripeCustomerId: "cus_stale",
      stripeSubscriptionId: "sub_stale",
      status: "canceled", // Different status
      periodEnd: Date.now(),
      eventId: "evt_older",
      eventTimestamp: olderTimestamp, // Older timestamp
    });

    // Should still have newer event's values
    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_stripe_customer", (q) =>
          q.eq("stripeCustomerId", "cus_stale")
        )
        .first();
    });

    expect(user?.subscriptionStatus).toBe("active"); // Not "canceled"
    expect(user?.lastStripeEventId).toBe("evt_newer"); // Newer event
  });

  test("getBillingInfo returns subscription data", async () => {
    const periodEnd = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const { clerkUserId } = await seedUser({
      stripeCustomerId: "cus_billing",
      subscriptionStatus: "past_due",
      subscriptionPeriodEnd: periodEnd,
    });

    const billingInfo = await t
      .withIdentity({ subject: clerkUserId })
      .query(api.subscriptions.getBillingInfo, {});

    expect(billingInfo?.stripeCustomerId).toBe("cus_billing");
    expect(billingInfo?.subscriptionStatus).toBe("past_due");
    expect(billingInfo?.subscriptionPeriodEnd).toBe(periodEnd);
  });
});
