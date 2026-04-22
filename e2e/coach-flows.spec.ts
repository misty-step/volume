import { test, expect } from "./auth-fixture";
import {
  coachInput,
  coachTimeline,
  createUniqueExerciseName,
  openCoachWorkspace,
  requestTodaySummary,
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
    await openCoachWorkspace(page, "/");
  });

  test("shows the coach workspace shell", async ({ page }) => {
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

  test("logs a set and stays usable for a follow-up turn", async ({ page }) => {
    const exerciseName = createUniqueExerciseName("Coach flow ");
    await createExerciseForCurrentUser(page, exerciseName);
    const setCountBefore = await countSetsForCurrentUser(page);

    await sendCoachMessage(page, `log 12 reps of "${exerciseName}"`);
    expect(await waitForSetCountIncrease(page, setCountBefore)).toBe(
      setCountBefore + 1
    );
    await openCoachWorkspace(page, "/");
    await requestTodaySummary(page);
  });

  test("archives and restores an exercise through generated UI", async ({
    page,
  }) => {
    const exerciseName = createUniqueExerciseName("PushupsCodex");
    await createExerciseForCurrentUser(page, exerciseName);

    await sendCoachMessage(page, `archive exercise "${exerciseName}"`);

    let archiveState: "pending" | "confirm" | "archived" = "pending";
    await expect
      .poll(
        async () => {
          if (
            await coachTimeline(page)
              .getByText(/Exercise archived/i)
              .last()
              .isVisible()
              .catch(() => false)
          ) {
            archiveState = "archived";
            return archiveState;
          }

          if (
            await coachTimeline(page)
              .getByText(/confirm|verify exercise name|go ahead/i)
              .last()
              .isVisible()
              .catch(() => false)
          ) {
            archiveState = "confirm";
            return archiveState;
          }

          return archiveState;
        },
        { timeout: 30_000 }
      )
      .not.toBe("pending");

    if (archiveState === "confirm") {
      await sendCoachMessage(page, exerciseName);
    }

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
