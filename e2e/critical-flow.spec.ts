import { test, expect } from "./auth-fixture";
import {
  coachTimeline,
  openCoachWorkspace,
  randomExerciseName,
  requestTodaySetCount,
  sendCoachMessage,
  waitForCoachText,
} from "./coach-helpers";

test.describe("Agentic workspace critical routes", () => {
  test.describe.configure({ mode: "serial" });

  test("logs and deletes a set through the workspace history flow", async ({
    page,
  }) => {
    const exerciseName = randomExerciseName("critical flow");

    await openCoachWorkspace(page, "/today");
    await sendCoachMessage(page, `log 10 reps of "${exerciseName}"`);
    await waitForCoachText(page, new RegExp(exerciseName, "i"));
    expect(await requestTodaySetCount(page)).toBe(1);

    await sendCoachMessage(page, "show history overview");
    await waitForCoachText(page, /History snapshot/i);
    const openLatestSet = coachTimeline(page)
      .getByRole("button", { name: /^Open$/i })
      .last();
    await expect(openLatestSet).toBeVisible({ timeout: 30_000 });
    await openLatestSet.click();

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

  test("history route redirects into the workspace and renders generated history", async ({
    page,
  }) => {
    await openCoachWorkspace(page, "/history");
    await waitForCoachText(page, /History snapshot/i);
    await expect(coachTimeline(page).getByText(/^Recent sets$/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("exercise history deep link collapses into the workspace history prompt", async ({
    page,
  }) => {
    await openCoachWorkspace(page, "/history/exercise/not-a-real-id");
    await waitForCoachText(page, /History snapshot/i);
    await expect(coachTimeline(page).getByText(/^Recent sets$/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});
