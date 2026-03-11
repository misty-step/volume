import type { Locator, Page } from "@playwright/test";
import { expect } from "./auth-fixture";

export function coachTimeline(page: Page): Locator {
  return page.getByTestId("coach-timeline");
}

export function coachComposer(page: Page): Locator {
  return page.getByTestId("coach-composer");
}

export function coachInput(page: Page): Locator {
  return coachComposer(page).getByRole("textbox");
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function openCoachWorkspace(
  page: Page,
  path = "/today"
): Promise<void> {
  await page.goto(path);
  await expect(page).toHaveURL(/\/today(?:\?.*)?$/);
  await expect(coachTimeline(page)).toBeVisible();
  await expect(coachComposer(page)).toBeVisible();
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
  const locator =
    typeof expected === "string"
      ? coachTimeline(page).getByText(expected, { exact: false })
      : coachTimeline(page).getByText(expected);
  await expect(locator.first()).toBeVisible({ timeout: 30_000 });
}

export function entityActionButton(
  page: Page,
  itemTitle: string,
  actionLabel: string | RegExp = /^Open$/i
): Locator {
  const actionContainer = coachTimeline(page)
    .getByText(itemTitle, { exact: true })
    .last()
    .locator("xpath=ancestor::div[.//button][1]");

  return typeof actionLabel === "string"
    ? actionContainer
        .getByRole("button")
        .filter({ hasText: new RegExp(`^${escapeRegExp(actionLabel)}$`) })
    : actionContainer.getByRole("button", { name: actionLabel });
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
