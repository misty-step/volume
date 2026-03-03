import type { Page } from "@playwright/test";
import { test, expect } from "./auth-fixture";

test.describe("Coach chat flows", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, resetUserData }) => {
    await resetUserData();
    await page.goto("/coach");
    await expect(page).toHaveURL(/\/today(?:\?.*)?$/);
    await expect(page.getByTestId("coach-timeline")).toBeVisible();
    await expect(page.getByTestId("coach-composer")).toBeVisible();
    await expect(getComposerInput(page)).toBeEnabled();
  });

  function getComposerInput(page: Page) {
    return page.getByTestId("coach-composer").getByRole("textbox");
  }

  async function sendMessage(page: Page, message: string) {
    const composer = page.getByTestId("coach-composer");
    const input = getComposerInput(page);

    await expect(input).toBeEnabled({ timeout: 30_000 });
    await input.fill(message);
    await composer.getByRole("button", { name: /send/i }).click();
    await expect(input).toBeDisabled({ timeout: 10_000 });
  }

  async function waitForResponse(page: Page, expected: string | RegExp) {
    const input = getComposerInput(page);
    const timeline = page.getByTestId("coach-timeline");

    await expect(input).toBeEnabled({ timeout: 30_000 });
    const expectedLocator =
      typeof expected === "string"
        ? timeline.getByText(expected, { exact: false })
        : timeline.getByText(expected);
    await expect(expectedLocator.first()).toBeVisible({ timeout: 30_000 });
  }

  async function logSet(page: Page, message: string) {
    await sendMessage(page, message);
    await waitForResponse(page, /Immediate impact/i);
  }

  test("log a set via natural language", async ({ page }) => {
    await logSet(page, "8 bench press @ 135 lbs");

    const timeline = page.getByTestId("coach-timeline");
    await expect(timeline.getByText(/Logged 8 bench press/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(timeline.getByText(/14-day trend/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("show today summary", async ({ page }) => {
    await logSet(page, `12 e2e summary ${Date.now()}`);

    await sendMessage(page, "what did I do today");
    await waitForResponse(page, /Today's totals/i);

    await expect(
      page.getByTestId("coach-timeline").getByText(/Top exercises today/i)
    ).toBeVisible({ timeout: 30_000 });
  });

  test("show trend for bench press", async ({ page }) => {
    test.fixme(
      true,
      "Needs seeded Bench Press history in the authenticated account."
    );

    await sendMessage(page, "show trend for bench press");
    await waitForResponse(page, /bench press 14-day trend/i);
  });

  test("show analytics", async ({ page }) => {
    await sendMessage(page, "show analytics");
    await waitForResponse(page, /Analytics overview/i);

    const timeline = page.getByTestId("coach-timeline");
    await expect(timeline.getByText(/Recent PRs/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(timeline.getByText(/Focus suggestions/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("show history", async ({ page }) => {
    await sendMessage(page, "show history");
    await waitForResponse(page, /History snapshot/i);

    await expect(
      page.getByTestId("coach-timeline").getByText(/Recent sets/i)
    ).toBeVisible({ timeout: 30_000 });
  });

  test("show exercise library", async ({ page }) => {
    await sendMessage(page, "show exercise library");
    await waitForResponse(page, /^Exercises$/i);

    await expect(
      page.getByTestId("coach-timeline").getByText(/Exercise library/i)
    ).toBeVisible({ timeout: 30_000 });
  });

  test("rename bench press to barbell bench press", async ({ page }) => {
    test.skip(
      true,
      "Requires an existing 'Bench Press' exercise in the authenticated account."
    );

    await sendMessage(page, "rename bench press to barbell bench press");
    await waitForResponse(page, /Exercise renamed/i);
  });

  test("rename exercise created in-session", async ({ page }) => {
    const seedName = `e2e rename source ${Date.now()}`;
    const newName = `e2e rename target ${Date.now()}`;

    await logSet(page, `10 ${seedName}`);
    await sendMessage(page, `rename exercise ${seedName} to ${newName}`);
    await waitForResponse(page, /Exercise renamed/i);
  });

  test("show my settings", async ({ page }) => {
    await sendMessage(page, "show my settings");
    await waitForResponse(page, /Training preferences/i);

    await expect(
      page.getByTestId("coach-timeline").getByText(/^Subscription$/i)
    ).toBeVisible({ timeout: 30_000 });
  });
});
