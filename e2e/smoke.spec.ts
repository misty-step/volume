import { test, expect } from "@playwright/test";
import { enableAnalyticsStub } from "@/lib/analytics/testkit/playwright";

test("landing page loads", async ({ page }) => {
  await enableAnalyticsStub(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/Volume/i);
  await expect(page.getByText("SIMPLE LOGGING.")).toBeVisible();
  await expect(page.getByRole("button", { name: "GET STARTED" })).toBeVisible();

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
        (e as { name?: string; props?: { path?: string } }).name ===
          "Marketing Page View" &&
        (e as { name?: string; props?: { path?: string } }).props?.path === "/"
    )
  ).toBeTruthy();
});

test("navigation to sign up", async ({ page }) => {
  await enableAnalyticsStub(page);
  await page.goto("/");
  await page.getByRole("button", { name: "GET STARTED" }).click();
  // Should redirect to sign-up (Clerk or local route)
  await expect(page).toHaveURL(/.*sign-up/);
});
