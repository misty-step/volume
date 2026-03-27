import { test, expect } from "./auth-fixture";
import {
  coachInput,
  coachTimeline,
  createUniqueExerciseName,
  openCoachWorkspace,
  requestTodaySetCount,
  sendCoachMessage,
  waitForCoachIdle,
  waitForCoachText,
} from "./coach-helpers";
import {
  countSetsForCurrentUser,
  createExerciseForCurrentUser,
  waitForSetCountIncrease,
} from "./convex-helpers";

test.describe("Coach chat flows", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await openCoachWorkspace(page, "/coach");
  });

  test("shows the coach workspace shell", async ({ page }) => {
    await expect(coachTimeline(page)).toBeVisible();
    await expect(coachInput(page)).toBeVisible();
    await expect(coachInput(page)).toBeEnabled();
    await expect(coachInput(page)).toHaveAttribute(
      "placeholder",
      'Log fast: "12 pushups @ 25 lbs"'
    );
  });

  test("logs a set and stays usable for a follow-up turn", async ({ page }) => {
    const exerciseName = createUniqueExerciseName("Coach flow ");
    await createExerciseForCurrentUser(page, exerciseName);
    const setCountBefore = await countSetsForCurrentUser(page);

    await sendCoachMessage(page, `log 12 reps of "${exerciseName}"`);
    expect(await waitForSetCountIncrease(page, setCountBefore)).toBe(
      setCountBefore + 1
    );
    await openCoachWorkspace(page, "/coach");

    expect(await requestTodaySetCount(page)).toBeGreaterThan(0);
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
