import { test, expect } from "./auth-fixture";
import {
  coachTimeline,
  openCoachWorkspace,
  waitForCoachText,
} from "./coach-helpers";

test.describe("Agentic workspace critical routes", () => {
  test.describe.configure({ mode: "serial" });

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
