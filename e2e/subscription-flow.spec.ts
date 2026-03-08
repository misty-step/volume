import { test, expect } from "./auth-fixture";
import {
  coachTimeline,
  openCoachWorkspace,
  waitForCoachText,
} from "./coach-helpers";

/**
 * Subscription and Paywall E2E Tests
 *
 * Tests the coach-first billing surface including:
 * - Public pricing page display
 * - Workspace settings / subscription blocks
 * - Authenticated access landing in the coach workspace
 */

test.describe("Subscription Flow", () => {
  test("Pricing page shows correct plans", async ({ page }) => {
    await page.goto("/pricing");

    // Verify page title
    await expect(page.getByRole("heading", { name: "Go Pro" })).toBeVisible();

    // Verify monthly price
    await expect(page.getByText("$8")).toBeVisible();
    await expect(page.getByText("/month")).toBeVisible();

    // Verify annual price with savings badge
    await expect(page.getByText("$70")).toBeVisible();
    await expect(page.getByText(/^\/year$/)).toBeVisible();
    await expect(page.getByText(/SAVE \$26/i)).toBeVisible();

    // Verify features list
    await expect(page.getByText("Unlimited exercises")).toBeVisible();
    await expect(page.getByText("AI weekly reports")).toBeVisible();
    await expect(page.getByText("CSV data export")).toBeVisible();

    // Verify trial messaging
    await expect(page.getByText("14-day free trial")).toBeVisible();
    await expect(page.getByText("No credit card required")).toBeVisible();
  });

  test("Settings page shows subscription status", async ({ page }) => {
    await openCoachWorkspace(page, "/settings");
    await waitForCoachText(page, /Training preferences/i);
    await expect(coachTimeline(page).getByText(/^Subscription$/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      coachTimeline(page).getByRole("button", {
        name: /Manage billing|Upgrade plan/i,
      })
    ).toBeVisible({
      timeout: 30_000,
    });
  });

  test("Checkout redirects to Stripe (monthly)", async ({ page }) => {
    await page.goto("/pricing");

    await page.getByText("Monthly").first().click();
    await page.getByRole("button", { name: /subscribe now/i }).click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
    expect(page.url()).toContain("checkout.stripe.com");
  });

  test("Checkout redirects to Stripe (annual)", async ({ page }) => {
    await page.goto("/pricing");

    await page.getByText("Annual").first().click();
    await page.getByRole("button", { name: /subscribe now/i }).click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
    expect(page.url()).toContain("checkout.stripe.com");
  });
});

test.describe("Paywall Gate", () => {
  test("Authenticated user lands in the coach workspace instead of a paywall page", async ({
    page,
  }) => {
    await openCoachWorkspace(page, "/today");
    await expect(coachTimeline(page)).toBeVisible();
    await expect(page.getByText(/Agent ready\./i)).toBeVisible();
  });

  test("Settings redirect hydrates subscription controls inside the workspace", async ({
    page,
  }) => {
    await openCoachWorkspace(page, "/settings");
    await waitForCoachText(page, /Training preferences/i);
    await expect(
      coachTimeline(page).getByRole("button", {
        name: /Manage billing|Upgrade plan/i,
      })
    ).toBeVisible({
      timeout: 30_000,
    });
  });
});
