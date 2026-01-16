import { test, expect } from "./auth-fixture";

/**
 * Subscription and Paywall E2E Tests
 *
 * Tests the Stripe subscription flow including:
 * - Pricing page display
 * - Checkout redirect to Stripe
 * - Settings page subscription status
 * - Paywall gate behavior
 *
 * NOTE: These tests verify UI flows, not actual Stripe transactions.
 * For Stripe webhook testing, use Stripe CLI: `stripe listen --forward-to localhost:3004/api/stripe/webhook`
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
    await expect(page.getByText("/year")).toBeVisible();
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
    await page.goto("/settings");

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Should show subscription section
    // The exact text depends on user's subscription state (trial, active, expired)
    const subscriptionSection = page.getByText(/subscription|trial|plan/i);
    await expect(subscriptionSection.first()).toBeVisible();
  });

  test("Checkout redirects to Stripe (monthly)", async ({ page }) => {
    await page.goto("/pricing");

    // Click on monthly plan area to select it (if toggle exists)
    const monthlyOption = page.getByText("Monthly").first();
    if (await monthlyOption.isVisible()) {
      await monthlyOption.click();
    }

    // Click the main CTA button
    const ctaButton = page.getByRole("button", { name: /start|subscribe|continue/i });
    await ctaButton.click();

    // Should redirect to Stripe Checkout
    // Wait for navigation (Stripe domain)
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });

    // Verify we're on Stripe's checkout page
    expect(page.url()).toContain("checkout.stripe.com");
  });

  test("Checkout redirects to Stripe (annual)", async ({ page }) => {
    await page.goto("/pricing");

    // Click on annual plan to select it
    const annualOption = page.getByText("Annual").first();
    await annualOption.click();

    // Click the main CTA button
    const ctaButton = page.getByRole("button", { name: /start|subscribe|continue/i });
    await ctaButton.click();

    // Should redirect to Stripe Checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });
    expect(page.url()).toContain("checkout.stripe.com");
  });
});

test.describe("Paywall Gate", () => {
  test("Authenticated user can access dashboard", async ({ page }) => {
    await page.goto("/today");

    // Should see dashboard, not paywall
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

    // Should NOT see paywall messaging
    await expect(page.getByText(/trial.*expired/i)).not.toBeVisible();
  });

  test("Settings page has manage subscription button", async ({ page }) => {
    await page.goto("/settings");

    // Look for subscription management options
    const manageButton = page.getByRole("button", { name: /manage|billing|subscription/i });

    // Button should exist (might be "Manage Subscription" or similar)
    // If user is on trial, might show "Upgrade" instead
    const upgradeButton = page.getByRole("button", { name: /upgrade|subscribe/i });

    // At least one of these should be visible
    const hasManage = await manageButton.isVisible().catch(() => false);
    const hasUpgrade = await upgradeButton.isVisible().catch(() => false);

    expect(hasManage || hasUpgrade).toBe(true);
  });
});

test.describe("Trial Banner", () => {
  // Note: This test may need a user in final 5 days of trial to see the banner
  // Consider creating a test fixture with a specific trial end date

  test.skip("Shows countdown in final 5 days", async ({ page }) => {
    // Skip unless we have a way to set trial end date for testing
    // This would require a test user with trial ending soon
    await page.goto("/today");

    // Look for trial banner
    const trialBanner = page.getByText(/trial.*days.*remaining/i);
    await expect(trialBanner).toBeVisible();
  });
});
