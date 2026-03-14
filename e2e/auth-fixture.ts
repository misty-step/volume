import { test as base, type Page } from "@playwright/test";
import { ensureAuthenticated } from "./clerk-helpers";

type AuthFixtures = {
  resetUserData: () => Promise<void>;
};

async function resetAuthenticatedE2EState(
  page: Page,
  baseURL: string | undefined
) {
  const secret = process.env.TEST_RESET_SECRET;
  if (!secret) {
    throw new Error(
      "TEST_RESET_SECRET must be set for authenticated E2E reset fixtures."
    );
  }

  if (!baseURL) {
    throw new Error(
      "Playwright baseURL must be set for authenticated E2E reset fixtures."
    );
  }

  await page.goto(baseURL);
  const response = await page.evaluate(
    async ({ providedSecret }) => {
      const result = await fetch("/api/test/reset", {
        method: "POST",
        headers: { "X-TEST-SECRET": providedSecret },
      });
      return {
        ok: result.ok,
        status: result.status,
        statusText: result.statusText,
      };
    },
    { providedSecret: secret }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to reset user data: ${response.status} ${response.statusText}`
    );
  }
}

export const test = base.extend<AuthFixtures>({
  page: async ({ page, baseURL }, use) => {
    await ensureAuthenticated(page, "/today");
    await resetAuthenticatedE2EState(page, baseURL);
    await use(page);
  },
  resetUserData: async ({ page, baseURL }, use) => {
    await use(async () => {
      await ensureAuthenticated(page, "/today");
      await resetAuthenticatedE2EState(page, baseURL);
      if (baseURL) {
        await page.goto(`${baseURL}/today`);
      }
    });
  },
});

export const publicTest = base.extend({
  storageState: { cookies: [], origins: [] },
});

export { expect } from "@playwright/test";
