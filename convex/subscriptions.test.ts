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
