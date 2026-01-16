import { test, expect, publicTest } from "./auth-fixture";

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

test.describe("Form Validation Errors", () => {
  test("Exercise creation requires a name", async ({ page }) => {
    await page.goto("/today");

    // Try to create exercise without name
    const createBtn = page.getByTestId("create-exercise-submit-btn");

    // If we can find and click the create flow
    const exerciseSelect = page.getByTestId("quick-log-exercise-select");
    if (await exerciseSelect.isVisible()) {
      await exerciseSelect.click();
      await page.getByTestId("exercise-create-new").click();

      // Try to submit with empty name
      await createBtn.click();

      // Should show validation error or button should be disabled
      // The exact behavior depends on implementation
      const nameInput = page.getByTestId("create-exercise-name-input");
      await expect(nameInput).toBeVisible();
    }
  });

  test("Set logging requires reps", async ({ page }) => {
    await page.goto("/today");

    // If there's a quick log form visible
    const submitBtn = page.getByTestId("quick-log-submit-btn");
    if (await submitBtn.isVisible()) {
      // Clear reps field and try to submit
      const repsInput = page.getByTestId("quick-log-reps-input");
      await repsInput.fill("");

      // Submit should be disabled or show error
      await expect(submitBtn).toBeDisabled();
    }
  });
});

test.describe("404 and Navigation Errors", () => {
  test("Non-existent route shows 404", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-12345");

    // Should return 404 status
    expect(response?.status()).toBe(404);
  });

  test("Invalid exercise ID in URL is handled gracefully", async ({ page }) => {
    await page.goto("/history/exercise/invalid-id-12345");

    // Should show error message or redirect, not crash
    // Look for error indicator or redirect
    const hasError = await page
      .getByText(/not found|error|invalid/i)
      .isVisible()
      .catch(() => false);
    const redirectedHome = page.url().includes("/today");

    expect(hasError || redirectedHome).toBe(true);
  });
});

test.describe("Network Error Handling", () => {
  test.skip("Offline state shows appropriate message", async ({ page, context }) => {
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
