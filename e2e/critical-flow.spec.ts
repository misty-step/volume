import { test, expect } from "./auth-fixture";
import {
  coachTimeline,
  openCoachWorkspace,
  randomExerciseName,
  sendCoachMessage,
  waitForAnalyticsOverview,
  waitForCoachText,
  waitForHistoryOverview,
} from "./coach-helpers";
import {
  countSetsForCurrentUser,
  createExerciseForCurrentUser,
  waitForSetCountIncrease,
} from "./convex-helpers";

test.describe("Agentic workspace critical routes", () => {
  test.describe.configure({ mode: "serial" });

  test("logs and deletes a set through the workspace history flow", async ({
    page,
  }) => {
    const exerciseName = randomExerciseName("critical flow");

    await openCoachWorkspace(page, "/");
    await createExerciseForCurrentUser(page, exerciseName);
    const setCountBefore = await countSetsForCurrentUser(page);
    await sendCoachMessage(page, `log 10 reps of "${exerciseName}"`);
    expect(await waitForSetCountIncrease(page, setCountBefore)).toBe(
      setCountBefore + 1
    );
    await openCoachWorkspace(page, "/history");
    await waitForHistoryOverview(page);
    await sendCoachMessage(page, `delete set "${exerciseName}"`);

    let deleteState: "pending" | "confirm" | "deleted" = "pending";
    await expect
      .poll(
        async () => {
          if (
            await coachTimeline(page)
              .getByText(/Set deleted/i)
              .last()
              .isVisible()
              .catch(() => false)
          ) {
            deleteState = "deleted";
            return deleteState;
          }

          if (
            await coachTimeline(page)
              .getByText(/confirm|go ahead|permanently delete/i)
              .last()
              .isVisible()
              .catch(() => false)
          ) {
            deleteState = "confirm";
            return deleteState;
          }

          return deleteState;
        },
        { timeout: 30_000 }
      )
      .not.toBe("pending");

    if (deleteState === "confirm") {
      await sendCoachMessage(page, "yes");
    }

    await waitForCoachText(page, /Set deleted/i);
  });
  test("analytics route redirects into the workspace and renders generated blocks", async ({
    page,
  }) => {
    await openCoachWorkspace(page, "/analytics");
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

  test("history route redirects into the workspace and renders generated history", async ({
    page,
  }) => {
    await openCoachWorkspace(page, "/history");
    await waitForHistoryOverview(page);
  });

  test("exercise history deep link collapses into the workspace history prompt", async ({
    page,
  }) => {
    await openCoachWorkspace(page, "/history/exercise/not-a-real-id");
    await waitForHistoryOverview(page);
  });
});
