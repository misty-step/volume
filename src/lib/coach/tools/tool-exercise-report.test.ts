// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  runExerciseSnapshotTool,
  runExerciseTrendTool,
} from "./tool-exercise-report";
import type { CoachToolContext } from "./types";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    exercises: {
      listExercises: "exercises.listExercises",
    },
    sets: {
      getRecentSetsForExercise: "sets.getRecentSetsForExercise",
    },
  },
}));

function makeCtx(overrides: Partial<CoachToolContext> = {}): CoachToolContext {
  return {
    convex: { query: vi.fn(), mutation: vi.fn(), action: vi.fn() } as any,
    defaultUnit: "lbs",
    timezoneOffsetMinutes: 0,
    turnId: "turn-test",
    ...overrides,
  } as CoachToolContext;
}

describe("exercise report disambiguation", () => {
  it("includes close_matches when exercise not found but similar names exist", async () => {
    const query = vi.fn();
    // listExercises returns exercises with partial name overlap
    query.mockResolvedValueOnce([
      { _id: "ex_1", name: "Bench Press", userId: "u1", createdAt: 1 },
      { _id: "ex_2", name: "Incline Bench", userId: "u1", createdAt: 2 },
      { _id: "ex_3", name: "Squat", userId: "u1", createdAt: 3 },
    ]);
    const ctx = makeCtx({
      convex: { query, mutation: vi.fn(), action: vi.fn() } as any,
    });

    const result = await runExerciseSnapshotTool(
      { exercise_name: "bench" },
      ctx
    );

    expect(result.outputForModel).toMatchObject({
      status: "error",
      error: "exercise_not_found",
      close_matches: ["Bench Press", "Incline Bench"],
    });
    expect(result.blocks[0]).toMatchObject({
      type: "status",
      tone: "info",
      title: "Did you mean one of these?",
    });
  });

  it("returns standard error when no close matches exist", async () => {
    const query = vi.fn();
    query.mockResolvedValueOnce([
      { _id: "ex_1", name: "Squat", userId: "u1", createdAt: 1 },
    ]);
    const ctx = makeCtx({
      convex: { query, mutation: vi.fn(), action: vi.fn() } as any,
    });

    const result = await runExerciseTrendTool(
      { exercise_name: "deadlift" },
      ctx
    );

    expect(result.outputForModel).toMatchObject({
      status: "error",
      error: "exercise_not_found",
      exercise_name: "deadlift",
    });
    expect(result.outputForModel).not.toHaveProperty("close_matches");
    expect(result.blocks[0]).toMatchObject({
      type: "status",
      tone: "error",
    });
  });

  it("returns data when exercise is found via exact match", async () => {
    const query = vi.fn();
    const now = Date.now();
    // listExercises
    query.mockResolvedValueOnce([
      { _id: "ex_1", name: "Bench Press", userId: "u1", createdAt: 1 },
    ]);
    // getRecentSetsForExercise
    query.mockResolvedValueOnce([
      {
        _id: "set_1",
        exerciseId: "ex_1",
        performedAt: now,
        reps: 10,
        userId: "u1",
      },
    ]);
    const ctx = makeCtx({
      convex: { query, mutation: vi.fn(), action: vi.fn() } as any,
    });

    const result = await runExerciseSnapshotTool(
      { exercise_name: "bench press" },
      ctx
    );

    expect(result.outputForModel).toMatchObject({
      status: "ok",
      exercise_name: "Bench Press",
    });
  });
});
