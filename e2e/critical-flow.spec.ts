import { test, expect } from "./auth-fixture";
import {
  clickEntityAction,
  coachTimeline,
  entityActionButton,
  escapeRegExp,
  openCoachWorkspace,
  sendCoachMessage,
  waitForCoachText,
} from "./coach-helpers";

test.describe("Agentic workspace critical routes", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ resetUserData }) => {
    await resetUserData();
  });

  test("logs and deletes a set through the workspace history flow", async ({
    page,
  }) => {
    const exerciseName = `critical flow ${Math.random().toString(36).slice(2, 8)}`;

    await openCoachWorkspace(page, "/today");
    await sendCoachMessage(page, `log ${exerciseName} 10 reps`);
    await waitForCoachText(page, new RegExp(escapeRegExp(exerciseName), "i"));

    await sendCoachMessage(page, "show today's summary");
    await waitForCoachText(page, /Today's totals/i);
    await expect(
      coachTimeline(page)
        .getByText(new RegExp(`^${escapeRegExp(exerciseName)}$`, "i"))
        .last()
    ).toBeVisible({
      timeout: 30_000,
    });

    const openAction = entityActionButton(page, exerciseName, /^Open$/i);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await sendCoachMessage(page, "show history overview");
      await waitForCoachText(page, /History snapshot/i);
      if (await openAction.isVisible().catch(() => false)) {
        break;
      }
    }

    await clickEntityAction(page, exerciseName, /^Open$/i);
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
