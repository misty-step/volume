import { clerk } from "@clerk/testing/playwright";
import { Page, expect } from "@playwright/test";
import { loadE2EEnv } from "./env";

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

function isSignInUrl(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith("/sign-in");
  } catch {
    return url.includes("/sign-in");
  }
}

export async function ensureAuthenticated(
  page: Page,
  entryPath = "/",
  timeoutMs = 60000
) {
  await page.goto(entryPath);

  if (!isSignInUrl(page.url())) {
    return;
  }

  const env = loadE2EEnv();

  await clerk.loaded({ page });
  await waitForClerkLoaded(page, timeoutMs);
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: env.CLERK_TEST_USER_EMAIL,
      password: env.CLERK_TEST_USER_PASSWORD,
    },
  });

  await page.goto(entryPath);
}

// Convenience helper to assert authenticated page is ready and toast region is present when needed
export async function assertNotificationsRegion(page: Page, timeoutMs = 10000) {
  const toast = page.locator('[role="region"][aria-label*="Notifications"]');
  await expect(toast).toBeVisible({ timeout: timeoutMs });
  return toast;
}
