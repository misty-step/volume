import { test, expect } from "@playwright/test";
import { enableAnalyticsStub } from "@/lib/analytics/testkit/playwright";

// This test file covers critical user flows.
// Note: These tests require an authenticated state.
// To run them, you need to set up Playwright authentication reuse or mock the auth provider.
// See: https://playwright.dev/docs/auth

// TODO: Enable after Playwright auth setup (see BACKLOG.md:238-246)
// Requires: Clerk test user credentials + auth-setup.ts implementation
test.skip("Critical Path: Log a Set emits analytics (stubbed)", async ({
  page,
}) => {
  await enableAnalyticsStub(page);
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

  const events = await page.evaluate(() => {
    const w = window as unknown as {
      __ANALYTICS__?: { state?: { events?: unknown[] } };
    };
    return w.__ANALYTICS__?.state?.events ?? [];
  });

  expect(
    events.some(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        (e as { name?: string; props?: { weight?: number; reps?: number } })
          .name === "Set Logged" &&
        (e as { name?: string; props?: { weight?: number; reps?: number } })
          .props?.weight === 135 &&
        (e as { name?: string; props?: { weight?: number; reps?: number } })
          .props?.reps === 10
    )
  ).toBeTruthy();
});

test("test-error route returns 404 in preview simulation", async ({
  request,
}) => {
  const response = await request.get("/api/test-error?type=report", {
    headers: { "x-preview-mode": "true" },
  });
  expect(response.status()).toBe(404);
});
