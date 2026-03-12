import { test as base } from "@playwright/test";
import { ensureAuthenticated } from "./clerk-helpers";

export const test = base.extend({
  page: async ({ page }, use) => {
    await ensureAuthenticated(page, "/today");
    await use(page);
  },
});

/**
 * Test instance with empty storage state for public/unauthenticated pages.
 */
export const publicTest = base.extend({
  storageState: { cookies: [], origins: [] },
});

export { expect } from "@playwright/test";
