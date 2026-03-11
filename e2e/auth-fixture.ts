import { test as base } from "@playwright/test";

type AuthFixtures = {
  resetUserData: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  resetUserData: async ({ page, baseURL }, use) => {
    await use(async () => {
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

      await page.goto(`${baseURL}/today`);
    });
  },
});

/**
 * Test instance with empty storage state for public/unauthenticated pages.
 */
export const publicTest = base.extend({
  storageState: { cookies: [], origins: [] },
});

export { expect } from "@playwright/test";
