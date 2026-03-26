// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runBulkLogTool } from "./tool-bulk-log";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    sets: {
      logSet: "sets.logSet",
    },
    agentActions: {
      recordLogSetAction: "agentActions.recordLogSetAction",
    },
    exercises: {
      createExercise: "exercises.createExercise",
      getExercise: "exercises.getExercise",
      listExercises: "exercises.listExercises",
    },
  },
}));

vi.mock("./data", () => ({
  ensureExercise: vi.fn(),
  listExercises: vi.fn(),
  buildTodayTotals: vi.fn().mockResolvedValue({
    totalSets: 0,
    totalReps: 0,
    totalDurationSeconds: 0,
    topExercises: [],
    exerciseCount: 0,
  }),
}));

import { ensureExercise } from "./data";

const mockEnsureExercise = vi.mocked(ensureExercise);
const mutation = vi.fn();
const query = vi.fn();

const TEST_CTX = {
  convex: { mutation, query },
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

function makeExercise(name: string) {
  return {
    _id: `exercise_${name}`,
    name,
    userId: "user_1",
    createdAt: Date.now(),
  };
}

describe("runBulkLogTool", () => {
  beforeEach(() => {
    mutation.mockReset();
    query.mockReset();
    mockEnsureExercise.mockReset();
  });

  it("logs multiple sets and returns summary", async () => {
    const benchEx = makeExercise("Bench Press");
    const squatEx = makeExercise("Squat");

    mockEnsureExercise
      .mockResolvedValueOnce({
        exercise: benchEx,
        created: false,
        exercises: [benchEx],
      })
      .mockResolvedValueOnce({
        exercise: squatEx,
        created: false,
        exercises: [squatEx],
      });

    mutation
      .mockResolvedValueOnce("set_1") // logSet for bench
      .mockResolvedValueOnce("action_1") // recordLogSetAction for bench
      .mockResolvedValueOnce("set_2") // logSet for squat
      .mockResolvedValueOnce("action_2"); // recordLogSetAction for squat

    const result = await runBulkLogTool(
      {
        sets: [
          { exercise_name: "Bench Press", reps: 10, weight: 135 },
          { exercise_name: "Squat", reps: 5, weight: 225 },
        ],
      },
      TEST_CTX as any
    );

    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.logged).toBe(2);
    expect(result.outputForModel.failed).toBe(0);
    expect(result.outputForModel.today_totals).toEqual({
      total_sets: 0,
      total_reps: 0,
      total_duration_seconds: 0,
      exercise_count: 0,
      top_exercises: [],
    });
    expect((result.blocks[0] as any).title).toBe("All sets logged");
  });

  it("returns partial status when one set fails", async () => {
    const benchEx = makeExercise("Bench Press");

    mockEnsureExercise
      .mockResolvedValueOnce({
        exercise: benchEx,
        created: false,
        exercises: [benchEx],
      })
      .mockRejectedValueOnce(new Error("exercise not found"));

    mutation
      .mockResolvedValueOnce("set_1") // logSet for bench
      .mockResolvedValueOnce("action_1"); // recordLogSetAction for bench

    const result = await runBulkLogTool(
      {
        sets: [
          { exercise_name: "Bench Press", reps: 10 },
          { exercise_name: "Unknown Exercise", reps: 5 },
        ],
      },
      TEST_CTX as any
    );

    expect(result.outputForModel.status).toBe("partial");
    expect(result.outputForModel.logged).toBe(1);
    expect(result.outputForModel.failed).toBe(1);
  });

  it("rejects invalid input (neither reps nor duration)", async () => {
    await expect(
      runBulkLogTool(
        { sets: [{ exercise_name: "Bench Press" }] },
        TEST_CTX as any
      )
    ).rejects.toThrow();
  });

  it("rejects empty sets array", async () => {
    await expect(
      runBulkLogTool({ sets: [] }, TEST_CTX as any)
    ).rejects.toThrow();
  });
});
