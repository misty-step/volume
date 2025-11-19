import { test, expect } from "@playwright/test";

// This test file covers critical user flows.
// Note: These tests require an authenticated state.
// To run them, you need to set up Playwright authentication reuse or mock the auth provider.
// See: https://playwright.dev/docs/auth

test.fixme("Critical Path: Log a Set", async ({ page }) => {
  // 1. Start at dashboard (assumes logged in)
  await page.goto("/today");

  // 2. Verify we are on the dashboard
  await expect(page.getByText("Today")).toBeVisible();

  // 3. Open Quick Log Form (if not already visible or in a modal)
  // Assuming QuickLogForm is visible on /today

  // 4. Select an exercise (assuming "Bench Press" exists)
  const exerciseInput = page.getByLabel("Exercise");
  await exerciseInput.click();
  await page.getByRole("option", { name: "Bench Press" }).click();

  // 5. Enter details
  await page.getByLabel("Weight").fill("135");
  await page.getByLabel("Reps").fill("10");

  // 6. Submit
  await page.getByRole("button", { name: "LOG SET" }).click();

  // 7. Verify Success
  await expect(page.getByText("Set logged")).toBeVisible();

  // 8. Verify it appears in history (optimistic update)
  await expect(page.getByText("135 lbs × 10")).toBeVisible();
});
