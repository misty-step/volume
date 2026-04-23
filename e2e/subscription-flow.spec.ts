import { devices } from "@playwright/test";
import { expect, publicTest, test } from "./auth-fixture";
import {
  coachInput,
  coachTimeline,
  openCoachWorkspace,
  waitForCoachIdle,
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
  publicTest("Pricing page shows correct plans", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByRole("heading", { name: "Go Pro" })).toBeVisible();
    await expect(page.getByText("$8")).toBeVisible();
    await expect(page.getByText("/month")).toBeVisible();
    await expect(page.getByText("$70")).toBeVisible();
    await expect(page.getByText(/^\/year$/)).toBeVisible();
    await expect(page.getByText(/SAVE \$26/i)).toBeVisible();
    await expect(page.getByText("Unlimited exercises")).toBeVisible();
    await expect(page.getByText("AI weekly reports")).toBeVisible();
    await expect(page.getByText("CSV data export")).toBeVisible();
    await expect(page.getByText("14-day free trial")).toBeVisible();
    await expect(page.getByText("No credit card required")).toBeVisible();
  });

  test("Settings page shows subscription controls", async ({ page }) => {
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

  publicTest("Pricing page surfaces a subscription CTA", async ({ page }) => {
    await page.goto("/pricing");
    const cta = page.getByRole("button", { name: /start free trial/i });
    await expect(cta).toBeVisible();
  });
});

test.describe("Paywall Gate", () => {
  test("Authenticated user lands in the coach workspace instead of a paywall page", async ({
    page,
  }) => {
    await openCoachWorkspace(page, "/");
    await expect(coachInput(page)).toBeVisible();
    await expect(coachInput(page)).toBeEnabled();
  });

  test("Settings redirect resolves to the workspace", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await waitForCoachText(page, /Training preferences/i);
    await expect(coachInput(page)).toBeVisible();
    await expect(coachInput(page)).toBeEnabled();
  });

  test("Authenticated mobile reload recovers to the workspace without a stuck paywall spinner", async ({
    baseURL,
    browser,
    page,
  }) => {
    const storageState = await page.context().storageState();
    const mobileContext = await browser.newContext({
      ...devices["iPhone 12"],
      baseURL,
      storageState,
    });

    await mobileContext.addInitScript(() => {
      const win = window as Window & {
        __sawPaywallBootstrapError?: boolean;
        __observePaywallBootstrapError?: () => void;
      };

      win.__sawPaywallBootstrapError = false;
      win.__observePaywallBootstrapError = () => {
        const markIfPresent = () => {
          if (
            document.querySelector('[data-testid="paywall-bootstrap-error"]')
          ) {
            win.__sawPaywallBootstrapError = true;
          }
        };

        markIfPresent();
        const observer = new MutationObserver(markIfPresent);
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-testid"],
        });
      };

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          () => win.__observePaywallBootstrapError?.(),
          { once: true }
        );
      } else {
        win.__observePaywallBootstrapError();
      }
    });

    const mobilePage = await mobileContext.newPage();

    try {
      await openCoachWorkspace(mobilePage, "/");
      await expect(coachInput(mobilePage)).toBeVisible();
      await expect(coachInput(mobilePage)).toBeEnabled();

      await mobilePage.reload();

      await waitForCoachIdle(mobilePage);
      await expect(coachInput(mobilePage)).toBeVisible();
      await expect(coachInput(mobilePage)).toBeEnabled();
      await expect(
        mobilePage.getByTestId("paywall-bootstrap-error")
      ).not.toBeVisible();
      const sawBootstrapError = await mobilePage.evaluate(() =>
        Boolean(
          (window as Window & { __sawPaywallBootstrapError?: boolean })
            .__sawPaywallBootstrapError
        )
      );
      expect(sawBootstrapError).toBe(false);
    } finally {
      await mobileContext.close();
    }
  });
});
