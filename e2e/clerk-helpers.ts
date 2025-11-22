import { Page, expect } from "@playwright/test";

// Wait for Clerk to fully load using Playwright primitives, with explicit timeout.
export async function waitForClerkLoaded(page: Page, timeoutMs = 60000) {
  await page.waitForFunction(
    () => {
      const clerkGlobal = (window as any).Clerk;
      return Boolean(clerkGlobal && clerkGlobal.loaded);
    },
    { timeout: timeoutMs }
  );
}

// Convenience helper to assert authenticated page is ready and toast region is present when needed
export async function assertNotificationsRegion(page: Page, timeoutMs = 10000) {
  const toast = page.locator('[role="region"][aria-label*="Notifications"]');
  await expect(toast).toBeVisible({ timeout: timeoutMs });
  return toast;
}
