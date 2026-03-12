import type { Locator, Page } from "@playwright/test";
import { expect } from "./auth-fixture";
import { ensureAuthenticated } from "./clerk-helpers";

export function coachTimeline(page: Page): Locator {
  return page.getByTestId("coach-timeline").or(page.locator("main"));
}

export function coachComposer(page: Page): Locator {
  return page.getByTestId("coach-composer").or(page.locator("main"));
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

export async function openCoachWorkspace(
  page: Page,
  entryPath = "/today"
): Promise<void> {
  // Coach entry routes like /coach and /settings hydrate into the /today workspace.
  await ensureAuthenticated(page, entryPath);
  await expect(page).toHaveURL(/\/today(?:\?.*)?$/);
  await expect(page.getByText(/Agent ready\./i)).toBeVisible();
  await expect(coachInput(page)).toBeVisible();
  await expect(coachInput(page)).toBeEnabled();
}

export async function waitForCoachIdle(page: Page): Promise<void> {
  await expect(coachInput(page)).toBeEnabled({ timeout: 30_000 });
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
  await expect(locator.first()).toBeVisible({ timeout: 30_000 });
}

export async function requestTodaySetCount(page: Page): Promise<number> {
  const totalsTitle = coachTimeline(page).getByText(/^Today's totals$/i);
  const emptyTitle = coachTimeline(page).getByText(/^No sets logged today$/i);
  const totalsBefore = await totalsTitle.count();
  const emptyBefore = await emptyTitle.count();

  await sendCoachMessage(page, "show today's summary");
  await expect
    .poll(
      async () =>
        (await totalsTitle.count()) > totalsBefore ||
        (await emptyTitle.count()) > emptyBefore,
      { timeout: 30_000 }
    )
    .toBe(true);

  if ((await totalsTitle.count()) > totalsBefore) {
    const text = await latestBlockForTitle(
      page,
      /^Today's totals$/i
    ).innerText();
    return Number.parseInt(parseMetricValue(text, "Sets"), 10);
  }

  return 0;
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
  const itemTitleLocator = coachTimeline(page)
    .getByText(itemTitle, { exact: true })
    .first();
  const row = itemTitleLocator.locator(
    "xpath=ancestor::*[@data-testid='entity-action-row']"
  );
  const action = row.getByRole("button", { name: actionLabel });
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
