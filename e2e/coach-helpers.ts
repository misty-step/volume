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
  return page.getByTestId("coach-timeline");
}

export function coachComposer(page: Page): Locator {
  return page.getByTestId("coach-composer");
}

export function coachScene(page: Page, testId: string): Locator {
  return coachTimeline(page).getByTestId(testId);
}

export function coachInput(page: Page): Locator {
  return coachComposer(page).getByPlaceholder(/log fast:/i);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function countTodaySummaryBlocks(page: Page): Promise<number> {
  const dailySnapshot = coachScene(page, "coach-scene-daily-snapshot");
  const totalsTitle = coachTimeline(page).getByText(/^Today's totals$/i);
  const emptyTitle = coachTimeline(page).getByText(/^No sets logged today$/i);
  return (
    (await dailySnapshot.count()) +
    (await totalsTitle.count()) +
    (await emptyTitle.count())
  );
}

export function randomExerciseName(prefix: string): string {
  const adjective =
    exerciseAdjectives[Math.floor(Math.random() * exerciseAdjectives.length)];
  const noun = exerciseNouns[Math.floor(Math.random() * exerciseNouns.length)];
  return `${prefix} ${adjective} ${noun}`;
}

export async function openCoachWorkspace(
  page: Page,
  entryPath = "/"
): Promise<void> {
  await ensureAuthenticated(page, entryPath);
  await expect(page).toHaveURL(/\/coach(?:\?.*)?$/);
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
  // CI can render the next coach block before the composer is re-enabled.
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
  await expect(coachScene(page, testId).last()).toBeVisible({
    timeout: 30_000,
  });
}

export async function requestTodaySummary(page: Page): Promise<void> {
  const summaryCountBefore = await countTodaySummaryBlocks(page);

  await sendCoachMessage(page, "show today's summary");
  await expect
    .poll(() => countTodaySummaryBlocks(page), { timeout: 30_000 })
    .toBeGreaterThan(summaryCountBefore);
}

export async function waitForAnalyticsOverview(page: Page): Promise<void> {
  const scene = coachScene(page, "coach-scene-analytics-overview");
  const title = coachTimeline(page).getByText(/^Analytics overview$/i);

  await expect
    .poll(async () => (await scene.count()) > 0 || (await title.count()) > 0, {
      timeout: 30_000,
    })
    .toBe(true);
}

export async function waitForHistoryOverview(page: Page): Promise<void> {
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
}

export async function clickUndo(page: Page): Promise<void> {
  await waitForCoachIdle(page);
  const button = coachTimeline(page)
    .getByRole("button", { name: /^Undo$/ })
    .last();
  await expect(button).toBeVisible({ timeout: 30_000 });
  await button.click();
}
