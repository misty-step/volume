import { test, expect } from "./auth-fixture";
import {
  clickEntityAction,
  clickSuggestion,
  clickUndo,
  coachInput,
  coachTimeline,
  createUniqueExerciseName,
  openCoachWorkspace,
  readTodaySetCount,
  requestTodaySetCount,
  sendCoachMessage,
  waitForAnalyticsOverview,
  waitForCoachIdle,
  waitForCoachText,
  waitForTodaySummary,
} from "./coach-helpers";
import { createExerciseForCurrentUser } from "./convex-helpers";

test.describe("Coach chat flows", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
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
    const exerciseName = createUniqueExerciseName("Coach flow ");

    await sendCoachMessage(page, `log 12 reps of "${exerciseName}"`);
    await waitForCoachText(page, new RegExp(`Logged.*${exerciseName}`, "i"));

    await clickSuggestion(page, "show today's summary");
    await waitForTodaySummary(page);
    expect(await readTodaySetCount(page)).toBe(1);

    await clickUndo(page);
    await waitForCoachText(page, /Action undone/i);

    expect(await requestTodaySetCount(page)).toBe(0);
  });

  test("opens analytics from the generated workspace actions", async ({
    page,
  }) => {
    await sendCoachMessage(page, "show workspace");
    await clickEntityAction(page, "Analytics overview");
    await waitForAnalyticsOverview(page);
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
    const exerciseName = createUniqueExerciseName("PushupsCodex");
    await createExerciseForCurrentUser(page, exerciseName);

    await sendCoachMessage(page, `archive exercise ${exerciseName}`);
    await waitForCoachIdle(page);

    await sendCoachMessage(page, "yes");
    await waitForCoachText(page, /Exercise archived/i);
    await waitForCoachText(page, /Need it back\?/i);

    const restoreButton = coachTimeline(page)
      .getByRole("button", { name: /^Restore$/ })
      .last();
    await waitForCoachIdle(page);
    await expect(restoreButton).toBeVisible({ timeout: 30_000 });
    await restoreButton.click();
    await expect(coachInput(page)).toBeDisabled({ timeout: 10_000 });

    await waitForCoachText(page, /Exercise restored/i);
    await sendCoachMessage(page, "show exercise library");
    await waitForCoachText(page, /Exercise library/i);
    await expect(
      coachTimeline(page)
        .getByText(new RegExp(`^${exerciseName}$`, "i"))
        .last()
    ).toBeVisible({
      timeout: 30_000,
    });
  });
});
