// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runUpdatePreferencesTool } from "./tool-update-preferences";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    users: {
      updatePreferences: "users.updatePreferences",
    },
  },
}));

const mutation = vi.fn();

const TEST_CTX = {
  convex: { mutation },
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

describe("runUpdatePreferencesTool", () => {
  beforeEach(() => {
    mutation.mockReset();
  });

  it("returns info when no preference fields are provided", async () => {
    const result = await runUpdatePreferencesTool({}, TEST_CTX as any);

    expect((result.blocks[0] as any).title).toBe("Nothing to update");
    expect(result.outputForModel).toEqual({ status: "ok", updated: false });
    expect(mutation).not.toHaveBeenCalled();
  });

  it("updates provided fields and maps names for mutation", async () => {
    mutation.mockResolvedValue(undefined);

    const result = await runUpdatePreferencesTool(
      {
        goals: ["build_muscle", "get_stronger"],
        custom_goal: "Improve pull-ups",
      },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("users.updatePreferences", {
      goals: ["build_muscle", "get_stronger"],
      customGoal: "Improve pull-ups",
      trainingSplit: undefined,
      coachNotes: undefined,
    });
    expect((result.blocks[0] as any).fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Goals",
          value: "Build muscle, Get stronger",
          emphasis: true,
        }),
        expect.objectContaining({
          label: "Custom goal",
          value: "Improve pull-ups",
          emphasis: true,
        }),
        expect.objectContaining({
          label: "Training split",
          value: "No change",
          emphasis: false,
        }),
      ])
    );
    expect(result.outputForModel).toEqual({
      status: "ok",
      updated: true,
      goals: ["build_muscle", "get_stronger"],
      custom_goal: "Improve pull-ups",
      training_split: null,
      coach_notes: null,
    });
  });
});
