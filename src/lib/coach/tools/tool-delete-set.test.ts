// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDeleteSetTool } from "./tool-delete-set";
import { resolveExercise, getRecentExerciseSets } from "./data";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    sets: {
      deleteSet: "sets.deleteSet",
    },
  },
}));

vi.mock("./data", () => ({
  resolveExercise: vi.fn(),
  getRecentExerciseSets: vi.fn(),
}));

const mockResolveExercise = vi.mocked(resolveExercise);
const mockGetRecentExerciseSets = vi.mocked(getRecentExerciseSets);
const mutation = vi.fn();

const TEST_CTX = {
  convex: { mutation },
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

function makeExercise() {
  return {
    _id: "exercise_1",
    name: "Bench Press",
    userId: "user_1",
    createdAt: Date.now(),
  } as any;
}

describe("runDeleteSetTool", () => {
  beforeEach(() => {
    mutation.mockReset();
    mockResolveExercise.mockReset();
    mockGetRecentExerciseSets.mockReset();
  });

  it("deletes by explicit set_id", async () => {
    mutation.mockResolvedValue(undefined);

    const result = await runDeleteSetTool(
      { set_id: "set_123" },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("sets.deleteSet", { id: "set_123" });
    expect(result.summary).toBe("Deleted set set_123.");
    expect(result.outputForModel).toEqual({
      status: "ok",
      deleted: true,
      set_id: "set_123",
    });
  });

  it("returns error when exercise cannot be found", async () => {
    mockResolveExercise.mockResolvedValue({ exercise: null, exercises: [] });

    const result = await runDeleteSetTool(
      { exercise_name: "Nope" },
      TEST_CTX as any
    );

    expect((result.blocks[0] as any).title).toBe("Exercise not found");
    expect(result.outputForModel).toEqual({
      status: "error",
      error: "exercise_not_found",
    });
    expect(mutation).not.toHaveBeenCalled();
  });

  it("returns info when no recent sets exist for exercise", async () => {
    const ex = makeExercise();
    mockResolveExercise.mockResolvedValue({
      exercise: ex,
      exercises: [ex],
    });
    mockGetRecentExerciseSets.mockResolvedValue([]);

    const result = await runDeleteSetTool(
      { exercise_name: "Bench Press" },
      TEST_CTX as any
    );

    expect((result.blocks[0] as any).title).toBe("No sets found");
    expect(result.outputForModel).toEqual({
      status: "ok",
      deleted: false,
      reason: "no_sets",
    });
    expect(mutation).not.toHaveBeenCalled();
  });

  it("deletes latest set for an exercise name", async () => {
    const ex = makeExercise();
    mockResolveExercise.mockResolvedValue({
      exercise: ex,
      exercises: [ex],
    });
    mockGetRecentExerciseSets.mockResolvedValue([
      {
        _id: "set_9",
        exerciseId: ex._id,
        reps: 10,
        performedAt: Date.now(),
      } as any,
    ]);
    mutation.mockResolvedValue(undefined);

    const result = await runDeleteSetTool(
      { exercise_name: "bench press" },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("sets.deleteSet", { id: "set_9" });
    expect(result.summary).toBe("Deleted latest Bench Press set.");
    expect(result.outputForModel).toEqual({
      status: "ok",
      deleted: true,
      set_id: "set_9",
    });
  });

  it("returns delete_failed with mutation error message", async () => {
    mutation.mockRejectedValue(new Error("already deleted"));

    const result = await runDeleteSetTool(
      { set_id: "set_404" },
      TEST_CTX as any
    );

    expect((result.blocks[0] as any).title).toBe("Delete failed");
    expect(result.outputForModel).toEqual({
      status: "error",
      error: "delete_failed",
      message: "already deleted",
    });
  });
});
