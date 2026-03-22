import type { Locator, Page } from "@playwright/test";
import { expect } from "./auth-fixture";
import { ensureAuthenticated } from "./clerk-helpers";

const exerciseAdjectives = [
  "maple",
  "summit",
  "harbor",
  "ember",
  "cinder",
  "meadow",
  "river",
  "atlas",
];

const exerciseNouns = [
  "press",
  "row",
  "lunge",
  "squat",
  "hinge",
  "carry",
  "stride",
  "reach",
];

export function coachTimeline(page: Page): Locator {
  return page.getByTestId("coach-timeline").or(page.locator("main"));
}

export function coachComposer(page: Page): Locator {
  return page.getByTestId("coach-composer").or(page.locator("main"));
}

export function coachScene(page: Page, testId: string): Locator {
  return coachTimeline(page).getByTestId(testId);
}

export function coachInput(page: Page): Locator {
  return page
    .getByRole("textbox", { name: /log fast/i })
    .or(page.getByPlaceholder(/log fast:/i));
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function latestBlockForTitle(page: Page, title: string | RegExp): Locator {
  return coachTimeline(page)
    .getByText(title, { exact: typeof title === "string" })
    .last()
    .locator("xpath=ancestor::section[1]");
}

function parseMetricValue(blockText: string, label: string): string {
  const lines = blockText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const normalizedLabel = label.toLowerCase();
  const labelIndex = lines.findIndex(
    (line) => line.toLowerCase() === normalizedLabel
  );
  if (labelIndex === -1 || labelIndex === lines.length - 1) {
    throw new Error(`Could not find metric "${label}" in block:\n${blockText}`);
  }
  return lines[labelIndex + 1] ?? "";
}

async function latestTodaySummaryBlock(page: Page): Promise<Locator> {
  const dailySnapshot = coachScene(page, "coach-scene-daily-snapshot");
  if ((await dailySnapshot.count()) > 0) {
    return dailySnapshot.last();
  }

  return latestBlockForTitle(page, /^Today's totals$/i);
}

export function randomExerciseName(prefix: string): string {
  const adjective =
    exerciseAdjectives[Math.floor(Math.random() * exerciseAdjectives.length)];
  const noun = exerciseNouns[Math.floor(Math.random() * exerciseNouns.length)];
  return `${prefix} ${adjective} ${noun}`;
}

export async function openCoachWorkspace(
  page: Page,
  entryPath = "/today"
): Promise<void> {
  await ensureAuthenticated(page, entryPath);
  await expect(page).toHaveURL(/\/today(?:\?.*)?$/);
  await expect(coachTimeline(page)).toBeVisible();
  await expect(coachInput(page)).toBeVisible();
  await waitForCoachIdle(page);
}

export async function waitForCoachIdle(page: Page): Promise<void> {
  // Must exceed the server-side COACH_TURN_TIMEOUT_MS (60s) to avoid
  // the test timing out before the coach turn naturally completes or errors.
  await expect(coachInput(page)).toBeEnabled({ timeout: 75_000 });
}

export async function sendCoachMessage(
  page: Page,
  message: string
): Promise<void> {
  const input = coachInput(page);

  await waitForCoachIdle(page);
  await input.fill(message);
  await coachComposer(page).getByRole("button", { name: /send/i }).click();
  await expect(input).toBeDisabled({ timeout: 10_000 });
}

export async function waitForCoachText(
  page: Page,
  expected: string | RegExp
): Promise<void> {
  await waitForCoachIdle(page);
  const locator =
    typeof expected === "string"
      ? coachTimeline(page).getByText(expected, { exact: false })
      : coachTimeline(page).getByText(expected);
  await expect(locator.last()).toBeVisible({ timeout: 30_000 });
}

export async function waitForCoachScene(
  page: Page,
  testId: string
): Promise<void> {
  await waitForCoachIdle(page);
  await expect(coachScene(page, testId).last()).toBeVisible({
    timeout: 30_000,
  });
}

export async function waitForTodaySummary(page: Page): Promise<void> {
  await waitForCoachIdle(page);
  const dailySnapshot = coachScene(page, "coach-scene-daily-snapshot");
  const totalsTitle = coachTimeline(page).getByText(/^Today's totals$/i);
  const emptyTitle = coachTimeline(page).getByText(/^No sets logged today$/i);

  await expect
    .poll(
      async () =>
        (await dailySnapshot.count()) > 0 ||
        (await totalsTitle.count()) > 0 ||
        (await emptyTitle.count()) > 0,
      { timeout: 30_000 }
    )
    .toBe(true);
}

export async function waitForAnalyticsOverview(page: Page): Promise<void> {
  await waitForCoachIdle(page);
  const scene = coachScene(page, "coach-scene-analytics-overview");
  const title = coachTimeline(page).getByText(/^Analytics overview$/i);

  await expect
    .poll(async () => (await scene.count()) > 0 || (await title.count()) > 0, {
      timeout: 30_000,
    })
    .toBe(true);
}

export async function waitForHistoryOverview(page: Page): Promise<void> {
  await waitForCoachIdle(page);
  const scene = coachScene(page, "coach-scene-history-timeline");
  const snapshot = coachTimeline(page).getByText(/^History snapshot$/i);
  const recentSets = coachTimeline(page).getByText(/^Recent sets$/i);

  await expect
    .poll(
      async () =>
        (await scene.count()) > 0 ||
        (await snapshot.count()) > 0 ||
        (await recentSets.count()) > 0,
      { timeout: 30_000 }
    )
    .toBe(true);
}

export async function waitForSettingsOverview(page: Page): Promise<void> {
  await waitForCoachIdle(page);
  const scene = coachScene(page, "coach-scene-settings");
  const title = coachTimeline(page).getByText(/^Training preferences$/i);
  const billingButton = coachTimeline(page).getByRole("button", {
    name: /Manage billing|Upgrade plan/i,
  });

  await expect
    .poll(
      async () =>
        (await scene.count()) > 0 ||
        (await title.count()) > 0 ||
        (await billingButton.count()) > 0,
      { timeout: 30_000 }
    )
    .toBe(true);
}

export function entityActionButton(
  page: Page,
  itemTitle: string,
  actionLabel: string | RegExp = /^Open$/i
): Locator {
  const actionContainer = coachTimeline(page)
    .getByTestId("entity-action-row")
    .filter({
      has: page.locator("p", {
        hasText: new RegExp(`^${escapeRegExp(itemTitle)}$`, "i"),
      }),
    })
    .last();

  return typeof actionLabel === "string"
    ? actionContainer
        .getByRole("button")
        .filter({ hasText: new RegExp(`^${escapeRegExp(actionLabel)}$`) })
    : actionContainer.getByRole("button", { name: actionLabel });
}

export async function requestTodaySetCount(page: Page): Promise<number> {
  const dailySnapshot = coachScene(page, "coach-scene-daily-snapshot");
  const totalsTitle = coachTimeline(page).getByText(/^Today's totals$/i);
  const emptyTitle = coachTimeline(page).getByText(/^No sets logged today$/i);
  const dailyBefore = await dailySnapshot.count();
  const totalsBefore = await totalsTitle.count();
  const emptyBefore = await emptyTitle.count();

  await sendCoachMessage(page, "show today's summary");
  await expect
    .poll(
      async () =>
        (await dailySnapshot.count()) > dailyBefore ||
        (await totalsTitle.count()) > totalsBefore ||
        (await emptyTitle.count()) > emptyBefore,
      { timeout: 30_000 }
    )
    .toBe(true);

  if (
    (await dailySnapshot.count()) > dailyBefore ||
    (await totalsTitle.count()) > totalsBefore
  ) {
    return await readTodaySetCount(page);
  }

  return 0;
}

export async function readTodaySetCount(page: Page): Promise<number> {
  const block = await latestTodaySummaryBlock(page);
  return Number.parseInt(parseMetricValue(await block.innerText(), "Sets"), 10);
}

export function createUniqueExerciseName(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}`;
}

export async function clickSuggestion(
  page: Page,
  label: string | RegExp
): Promise<void> {
  await waitForCoachIdle(page);
  const button = coachTimeline(page)
    .getByRole("button", { name: label })
    .last();
  await expect(button).toBeVisible({ timeout: 30_000 });
  await button.click();
  await expect(coachInput(page)).toBeDisabled({ timeout: 10_000 });
}

export async function clickEntityAction(
  page: Page,
  itemTitle: string,
  actionLabel: string | RegExp = /^Open$/i
): Promise<void> {
  await waitForCoachIdle(page);
  const action = entityActionButton(page, itemTitle, actionLabel);
  await expect(action).toBeVisible({ timeout: 30_000 });
  await action.click();
  await expect(coachInput(page)).toBeDisabled({ timeout: 10_000 });
}

export async function clickUndo(page: Page): Promise<void> {
  await waitForCoachIdle(page);
  const button = coachTimeline(page)
    .getByRole("button", { name: /^Undo$/ })
    .last();
  await expect(button).toBeVisible({ timeout: 30_000 });
  await button.click();
}
