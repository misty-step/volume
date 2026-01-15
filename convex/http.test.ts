import { describe, expect, test } from "vitest";
import type Stripe from "stripe";
import { getPeriodEndMs, mapStripeStatus } from "./http";

function makeSubscription(
  overrides: Partial<Stripe.Subscription>
): Stripe.Subscription {
  return {
    id: "sub_test",
    status: "active",
    cancel_at_period_end: false,
    items: { data: [] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("Stripe webhook helpers", () => {
  test("mapStripeStatus honors cancel_at_period_end", () => {
    const subscription = makeSubscription({
      status: "active",
      cancel_at_period_end: true,
    });

    expect(mapStripeStatus(subscription)).toBe("canceled");
  });

  test("mapStripeStatus maps trialing to trial", () => {
    const subscription = makeSubscription({ status: "trialing" });
    expect(mapStripeStatus(subscription)).toBe("trial");
  });

  test("mapStripeStatus passes through past_due", () => {
    const subscription = makeSubscription({ status: "past_due" });
    expect(mapStripeStatus(subscription)).toBe("past_due");
  });

  test("getPeriodEndMs extracts period end from subscription item", () => {
    const subscription = makeSubscription({
      items: { data: [{ current_period_end: 123 }] },
    });

    expect(getPeriodEndMs(subscription)).toBe(123 * 1000);
  });

  test("getPeriodEndMs throws when period end is missing", () => {
    const subscription = makeSubscription({ items: { data: [] } });

    expect(() => getPeriodEndMs(subscription)).toThrow(
      "current_period_end not found"
    );
  });
});
