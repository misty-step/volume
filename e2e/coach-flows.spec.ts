import { test, expect } from "./auth-fixture";
import {
  clickEntityAction,
  clickSuggestion,
  clickUndo,
  coachInput,
  coachTimeline,
  openCoachWorkspace,
  sendCoachMessage,
  waitForCoachIdle,
  waitForCoachText,
} from "./coach-helpers";

test.describe("Coach chat flows", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, resetUserData }) => {
    await resetUserData();
    await openCoachWorkspace(page, "/coach");
  });

  test("shows the coach workspace shell", async ({ page }) => {
    await expect(
      page.getByText(
        /Agent ready\. Ask to log a set, review progress, or update settings\./i
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        /Try "12 pushups", "show today's summary", or ask for insights\./i
      )
    ).toBeVisible();
    await expect(coachInput(page)).toHaveAttribute(
      "placeholder",
      'Log fast: "12 pushups @ 25 lbs"'
    );
  });

  test("logs a set, follows a generated suggestion, and undoes the action", async ({
    page,
  }) => {
    await sendCoachMessage(page, "12 pushups");
    await waitForCoachText(page, /Logged 12 pushups/i);

    await clickSuggestion(page, "show today's summary");
    await waitForCoachText(page, /Today's totals/i);
    await expect(
      coachTimeline(page).getByText(/Top exercises today/i)
    ).toBeVisible({
      timeout: 30_000,
    });

    await clickUndo(page);
    await waitForCoachText(page, /Action undone/i);

    await sendCoachMessage(page, "show today's summary");
    await waitForCoachText(page, /No sets logged today/i);
  });

  test("opens analytics from the generated workspace actions", async ({
    page,
  }) => {
    await sendCoachMessage(page, "show workspace");
    await waitForCoachText(page, /Core workflows/i);

    await clickEntityAction(page, "Analytics overview");
    await waitForCoachText(page, /Analytics overview/i);
    await expect(
      coachTimeline(page)
        .getByText(/^Recent PRs$/i)
        .first()
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      coachTimeline(page)
        .getByText(/^Focus suggestions$/i)
        .first()
    ).toBeVisible({
      timeout: 30_000,
    });
  });

  test("archives and restores an exercise through generated UI", async ({
    page,
  }) => {
    await sendCoachMessage(page, "10 pushups");
    await waitForCoachText(page, /Logged 10 pushups/i);

    await sendCoachMessage(page, "archive exercise pushups");
    await waitForCoachIdle(page);

    await sendCoachMessage(page, "yes");
    await waitForCoachText(page, /Exercise archived/i);
    await waitForCoachText(page, /Need it back\?/i);

    const restoreButton = coachTimeline(page)
      .getByRole("button", { name: /^Restore$/ })
      .last();
    await expect(restoreButton).toBeVisible({ timeout: 30_000 });
    await restoreButton.click();

    await waitForCoachText(page, /Exercise restored/i);
    await sendCoachMessage(page, "show exercise library");
    await waitForCoachText(page, /Exercise library/i);
    await expect(
      coachTimeline(page)
        .getByText(/^pushups$/i)
        .last()
    ).toBeVisible({
      timeout: 30_000,
    });
  });
});
