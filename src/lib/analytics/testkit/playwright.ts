import { Page } from "@playwright/test";

/**
 * Sets up the analytics stub in the browser before app code runs.
 *
 * Call in Playwright tests:
 *   await enableAnalyticsStub(page);
 * Then assert against window.__ANALYTICS__.state.events.
 */
export async function enableAnalyticsStub(page: Page) {
  await page.addInitScript(() => {
    (
      window as unknown as {
        __ANALYTICS__?: {
          state: { events: unknown[]; errors: unknown[] };
          reset: () => void;
        };
      }
    ).__ANALYTICS__ = {
      state: { events: [], errors: [] },
      reset() {
        this.state.events = [];
        this.state.errors = [];
      },
    };
  });
}
