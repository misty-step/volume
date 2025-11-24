import { test as base } from "@playwright/test";

type AuthFixtures = {
  resetUserData: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  resetUserData: async ({ request, baseURL }, use) => {
    await use(async () => {
      const secret = process.env.TEST_RESET_SECRET;
      if (!secret) {
        console.warn("TEST_RESET_SECRET not set, skipping user data reset.");
        return;
      }

      // We will implement the endpoint later
      const response = await request.post(`${baseURL}/api/test/reset`, {
        headers: { "X-TEST-SECRET": secret },
      });

      if (!response.ok()) {
        console.warn(
          `Failed to reset user data: ${response.status()} ${response.statusText()}`
        );
      }
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
