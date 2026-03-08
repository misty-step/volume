import { test, expect, publicTest } from "./auth-fixture";
import {
  coachComposer,
  coachInput,
  coachTimeline,
  openCoachWorkspace,
  waitForCoachText,
} from "./coach-helpers";

/**
 * Error Scenario E2E Tests
 *
 * Ousterhout: "The best way to reduce debugging time is to prevent bugs."
 * These tests verify the app handles errors gracefully, reducing user confusion
 * and support burden.
 */

test.describe("Authentication Errors", () => {
  // Use publicTest for unauthenticated scenarios
  publicTest(
    "Unauthenticated user is redirected from protected routes",
    async ({ page }) => {
      // Try to access protected route directly
      await page.goto("/today");

      // Should redirect to sign-in
      await page.waitForURL(/sign-in/, { timeout: 10000 });
      expect(page.url()).toContain("sign-in");
    }
  );

  publicTest(
    "Unauthenticated user is redirected from settings",
    async ({ page }) => {
      await page.goto("/settings");
      await page.waitForURL(/sign-in/, { timeout: 10000 });
      expect(page.url()).toContain("sign-in");
    }
  );

  publicTest(
    "Unauthenticated user is redirected from history",
    async ({ page }) => {
      await page.goto("/history");
      await page.waitForURL(/sign-in/, { timeout: 10000 });
      expect(page.url()).toContain("sign-in");
    }
  );
});

test.describe("404 and Navigation Errors", () => {
  test("Non-existent route shows 404", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-12345");

    // Should return 404 status
    expect(response?.status()).toBe(404);
  });

  test("Invalid exercise deep link is handled via workspace redirect", async ({
    page,
    resetUserData,
  }) => {
    await resetUserData();
    await openCoachWorkspace(page, "/history/exercise/invalid-id-12345");
    await waitForCoachText(page, /History snapshot/i);
    await expect(coachTimeline(page).getByText(/^Recent sets$/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe("Coach Composer Validation", () => {
  test("Send action stays disabled for blank input", async ({
    page,
    resetUserData,
  }) => {
    await resetUserData();
    await openCoachWorkspace(page, "/today");

    const input = coachInput(page);
    const sendButton = coachComposer(page).getByRole("button", {
      name: /send/i,
    });

    await expect(sendButton).toBeDisabled();
    await input.fill("   ");
    await expect(sendButton).toBeDisabled();
  });
});

test.describe("Network Error Handling", () => {
  test.skip("Offline state shows appropriate message", async ({
    page,
    context,
  }) => {
    // This test requires offline simulation which may need special setup
    await page.goto("/today");

    // Go offline
    await context.setOffline(true);

    // Try an action that requires network
    // The app should show an offline indicator or error

    // Restore online state
    await context.setOffline(false);
  });
});
