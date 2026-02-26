// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSettingsOverviewTool } from "./tool-settings-overview";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    users: {
      getCurrentUser: "users.getCurrentUser",
      getSubscriptionStatus: "users.getSubscriptionStatus",
    },
    subscriptions: {
      getBillingInfo: "subscriptions.getBillingInfo",
    },
  },
}));

const query = vi.fn();

const TEST_CTX = {
  convex: { query },
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

describe("runSettingsOverviewTool", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("returns training preferences and portal CTA when customer exists", async () => {
    query
      .mockResolvedValueOnce({
        preferences: {
          goals: ["build_muscle", "get_stronger"],
          customGoal: "Nail strict pull-ups",
          trainingSplit: "Push Pull Legs",
          coachNotes: "Keep form strict",
        },
      })
      .mockResolvedValueOnce({
        status: "active",
        hasAccess: true,
        trialDaysRemaining: 0,
        subscriptionPeriodEnd: 1_735_689_600_000,
      })
      .mockResolvedValueOnce({
        stripeCustomerId: "cus_123",
        subscriptionStatus: "active",
        subscriptionPeriodEnd: 1_735_689_600_000,
      });

    const result = await runSettingsOverviewTool(TEST_CTX as any);
    const prefs = result.blocks[0] as any;
    const billing = result.blocks[1] as any;

    expect(query).toHaveBeenNthCalledWith(1, "users.getCurrentUser", {});
    expect(query).toHaveBeenNthCalledWith(2, "users.getSubscriptionStatus", {});
    expect(query).toHaveBeenNthCalledWith(
      3,
      "subscriptions.getBillingInfo",
      {}
    );

    expect(prefs.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Goals",
          value: "Build muscle, Get stronger",
        }),
        expect.objectContaining({
          label: "Custom goal",
          value: "Nail strict pull-ups",
        }),
      ])
    );
    expect(billing.ctaAction).toBe("open_billing_portal");
    expect(billing.ctaLabel).toBe("Manage billing");
    expect(billing.periodEnd).toBeTypeOf("string");
    expect(result.outputForModel).toEqual({
      status: "ok",
      subscription_status: "active",
      has_access: true,
      stripe_customer: true,
      goals: ["build_muscle", "get_stronger"],
    });
  });

  it("uses defaults and checkout CTA when user data is missing", async () => {
    query
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        stripeCustomerId: null,
        subscriptionStatus: "expired",
        subscriptionPeriodEnd: null,
      });

    const result = await runSettingsOverviewTool(TEST_CTX as any);
    const prefs = result.blocks[0] as any;
    const billing = result.blocks[1] as any;

    expect(prefs.fields[0]).toEqual(
      expect.objectContaining({ label: "Goals", value: "Not set" })
    );
    expect(billing.status).toBe("expired");
    expect(billing.ctaAction).toBe("open_checkout");
    expect(billing.ctaLabel).toBe("Upgrade plan");
    expect(billing.periodEnd).toBeUndefined();
    expect(result.outputForModel).toEqual({
      status: "ok",
      subscription_status: "expired",
      has_access: false,
      stripe_customer: false,
      goals: [],
    });
  });
});
