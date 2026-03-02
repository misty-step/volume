// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  runDeleteExerciseTool,
  runMergeExerciseTool,
  runRenameExerciseTool,
  runRestoreExerciseTool,
  runUpdateExerciseMuscleGroupsTool,
} from "./tool-manage-exercise";
import { resolveExercise } from "./data";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    exercises: {
      updateExercise: "exercises.updateExercise",
      mergeExercise: "exercises.mergeExercise",
      deleteExercise: "exercises.deleteExercise",
      restoreExercise: "exercises.restoreExercise",
      updateMuscleGroups: "exercises.updateMuscleGroups",
    },
  },
}));

vi.mock("./data", () => ({
  resolveExercise: vi.fn(),
}));

const mockResolveExercise = vi.mocked(resolveExercise);
const mutation = vi.fn();

const TEST_CTX = {
  convex: { mutation },
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

function exercise(overrides: Record<string, unknown> = {}) {
  return {
    _id: "exercise_1",
    name: "Push Ups",
    userId: "user_1",
    createdAt: Date.now(),
    ...overrides,
  } as any;
}

describe("tool-manage-exercise", () => {
  beforeEach(() => {
    mockResolveExercise.mockReset();
    mutation.mockReset();
  });

  it("returns error when exercise not found for rename", async () => {
    mockResolveExercise.mockResolvedValue({ exercise: null, exercises: [] });

    const result = await runRenameExerciseTool(
      { exercise_name: "Push Ups", new_name: "Bench Press" },
      TEST_CTX as any
    );

    expect(result.outputForModel).toEqual({
      status: "error",
      error: "exercise_not_found",
    });
    expect((result.blocks[0] as any).tone).toBe("error");
    expect(mutation).not.toHaveBeenCalled();
  });

  it("renames exercise and returns success status", async () => {
    mockResolveExercise.mockResolvedValue({
      exercise: exercise(),
      exercises: [exercise()],
    });
    mutation.mockResolvedValue(undefined);

    const result = await runRenameExerciseTool(
      { exercise_name: "push-ups", new_name: "  BENCH   press  " },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("exercises.updateExercise", {
      id: "exercise_1",
      name: "Bench Press",
    });
    expect(result.outputForModel).toEqual({
      status: "ok",
      previous_name: "Push Ups",
      new_name: "Bench Press",
    });
    expect((result.blocks[0] as any).title).toBe("Exercise renamed");
  });

  it("treats already-deleted rename target as not found", async () => {
    mockResolveExercise.mockResolvedValue({
      exercise: exercise({ deletedAt: Date.now(), name: "Push Ups" }),
      exercises: [exercise({ deletedAt: Date.now(), name: "Push Ups" })],
    });

    const result = await runRenameExerciseTool(
      { exercise_name: "push ups", new_name: "Bench Press" },
      TEST_CTX as any
    );

    expect(result.outputForModel).toEqual({
      status: "error",
      error: "exercise_not_found",
    });
    expect(mutation).not.toHaveBeenCalled();
  });

  it("returns error when source exercise is missing for merge", async () => {
    mockResolveExercise
      .mockResolvedValueOnce({ exercise: null, exercises: [] })
      .mockResolvedValueOnce({
        exercise: exercise({ _id: "exercise_target", name: "Bench Press" }),
        exercises: [],
      });

    const result = await runMergeExerciseTool(
      { source_exercise: "Barbell Bench", target_exercise: "Bench Press" },
      TEST_CTX as any
    );

    expect((result.blocks[0] as any).tone).toBe("error");
    expect(result.outputForModel).toEqual({
      status: "error",
      error: "source_exercise_not_found",
    });
    expect(mutation).not.toHaveBeenCalled();
  });

  it("returns error when target exercise is missing for merge", async () => {
    mockResolveExercise
      .mockResolvedValueOnce({
        exercise: exercise({ _id: "exercise_source", name: "Barbell Bench" }),
        exercises: [],
      })
      .mockResolvedValueOnce({ exercise: null, exercises: [] });

    const result = await runMergeExerciseTool(
      { source_exercise: "Barbell Bench", target_exercise: "Bench Press" },
      TEST_CTX as any
    );

    expect((result.blocks[0] as any).tone).toBe("error");
    expect(result.outputForModel).toEqual({
      status: "error",
      error: "target_exercise_not_found",
    });
    expect(mutation).not.toHaveBeenCalled();
  });

  it("rejects when merge source and target are the same exercise", async () => {
    await expect(
      runMergeExerciseTool(
        { source_exercise: "bench press", target_exercise: "BENCH PRESS" },
        TEST_CTX as any
      )
    ).rejects.toThrow("Source and target exercises must be different.");

    expect(mockResolveExercise).not.toHaveBeenCalled();
    expect(mutation).not.toHaveBeenCalled();
  });

  it("merges exercises and returns a success summary with count", async () => {
    mockResolveExercise
      .mockResolvedValueOnce({
        exercise: exercise({
          _id: "exercise_source",
          name: "Bench Press Barbell",
        }),
        exercises: [],
      })
      .mockResolvedValueOnce({
        exercise: exercise({ _id: "exercise_target", name: "Bench Press" }),
        exercises: [],
      });
    mutation.mockResolvedValueOnce({
      mergedCount: 5,
      keptExercise: "Bench Press",
    });

    const result = await runMergeExerciseTool(
      {
        source_exercise: "bench press barbell",
        target_exercise: "bench press",
      },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("exercises.mergeExercise", {
      fromId: "exercise_source",
      toId: "exercise_target",
    });
    expect((result.blocks[0] as any).tone).toBe("success");
    expect((result.blocks[0] as any).description).toContain("5");
    expect(result.outputForModel).toEqual({
      status: "ok",
      source_exercise: "Bench Press Barbell",
      target_exercise: "Bench Press",
      merged_count: 5,
    });
  });

  it("handles archived source exercise gracefully for merge", async () => {
    mockResolveExercise
      .mockResolvedValueOnce({
        exercise: exercise({
          _id: "exercise_source",
          name: "Bench Press Barbell",
          deletedAt: Date.now(),
        }),
        exercises: [],
      })
      .mockResolvedValueOnce({
        exercise: exercise({ _id: "exercise_target", name: "Bench Press" }),
        exercises: [],
      });

    const result = await runMergeExerciseTool(
      {
        source_exercise: "bench press barbell",
        target_exercise: "bench press",
      },
      TEST_CTX as any
    );

    expect((result.blocks[0] as any).tone).toBe("error");
    expect(result.outputForModel).toEqual({
      status: "error",
      error: "source_exercise_archived",
    });
    expect(mutation).not.toHaveBeenCalled();
  });

  it("archives active exercise and returns confirmation block", async () => {
    mockResolveExercise.mockResolvedValue({
      exercise: exercise({ name: "Squat" }),
      exercises: [exercise({ name: "Squat" })],
    });
    mutation.mockResolvedValue(undefined);

    const result = await runDeleteExerciseTool(
      { exercise_name: "squat" },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("exercises.deleteExercise", {
      id: "exercise_1",
    });
    expect((result.blocks[0] as any).title).toBe("Exercise archived");
    expect((result.blocks[1] as any).type).toBe("confirmation");
    expect(result.outputForModel).toEqual({
      status: "ok",
      archived_name: "Squat",
    });
  });

  it("restores archived exercise", async () => {
    mockResolveExercise.mockResolvedValue({
      exercise: exercise({ name: "Deadlift", deletedAt: Date.now() }),
      exercises: [exercise({ name: "Deadlift", deletedAt: Date.now() })],
    });
    mutation.mockResolvedValue(undefined);

    const result = await runRestoreExerciseTool(
      { exercise_name: "deadlift" },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("exercises.restoreExercise", {
      id: "exercise_1",
    });
    expect(result.outputForModel).toEqual({
      status: "ok",
      restored_name: "Deadlift",
    });
  });

  it("returns info when restoring an already-active exercise", async () => {
    mockResolveExercise.mockResolvedValue({
      exercise: exercise({ name: "Press" }),
      exercises: [exercise({ name: "Press" })],
    });

    const result = await runRestoreExerciseTool(
      { exercise_name: "press" },
      TEST_CTX as any
    );

    expect((result.blocks[0] as any).title).toBe("Already active");
    expect(result.outputForModel).toEqual({
      status: "ok",
      already_active: true,
    });
    expect(mutation).not.toHaveBeenCalled();
  });

  it("updates muscle groups and deduplicates/title-cases values", async () => {
    mockResolveExercise.mockResolvedValue({
      exercise: exercise({ name: "Row" }),
      exercises: [exercise({ name: "Row" })],
    });
    mutation.mockResolvedValue(undefined);

    const result = await runUpdateExerciseMuscleGroupsTool(
      {
        exercise_name: "row",
        muscle_groups: ["chest", "CHEST", "  triceps  "],
      },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("exercises.updateMuscleGroups", {
      id: "exercise_1",
      muscleGroups: ["Chest", "Triceps"],
    });
    expect(result.outputForModel).toEqual({
      status: "ok",
      exercise_name: "Row",
      muscle_groups: ["Chest", "Triceps"],
    });
  });

  it("returns error when exercise is missing for muscle-group update", async () => {
    mockResolveExercise.mockResolvedValue({ exercise: null, exercises: [] });

    const result = await runUpdateExerciseMuscleGroupsTool(
      {
        exercise_name: "curl",
        muscle_groups: ["biceps"],
      },
      TEST_CTX as any
    );

    expect(result.outputForModel).toEqual({
      status: "error",
      error: "exercise_not_found",
    });
    expect(mutation).not.toHaveBeenCalled();
  });
});
