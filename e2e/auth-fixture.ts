import { test as base } from "@playwright/test";
import { ensureAuthenticated } from "./clerk-helpers";

type AuthFixtures = {
  resetUserData: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  page: async ({ page }, use) => {
    await ensureAuthenticated(page, "/today");
    await use(page);
  },
  resetUserData: async ({ page, baseURL }, use) => {
    await use(async () => {
      const secret = process.env.TEST_RESET_SECRET;
      if (!secret) {
        throw new Error("TEST_RESET_SECRET is required for resetUserData().");
      }

      if (!baseURL) {
        throw new Error("Playwright baseURL is required for resetUserData().");
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

export const publicTest = base.extend({
  storageState: { cookies: [], origins: [] },
});

export { expect } from "@playwright/test";
