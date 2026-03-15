import { describe, expect, it, vi, beforeEach } from "vitest";
import { LogSetArgsSchema } from "./schemas";

vi.mock("./data", () => ({
  ensureExercise: vi.fn(),
  buildTodayTotals: vi.fn(),
}));

import { ensureExercise, buildTodayTotals } from "./data";
import { runLogSetTool } from "./tool-log-set";
import type { CoachToolContext } from "./types";

const mockMutation = vi.fn();
const mockCtx: CoachToolContext = {
  convex: {
    query: vi.fn(),
    mutation: mockMutation,
  } as unknown as CoachToolContext["convex"],
  defaultUnit: "lbs",
  timezoneOffsetMinutes: 0,
  turnId: "test-turn",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runLogSetTool", () => {
  it("returns today_totals in outputForModel after successful log", async () => {
    vi.mocked(ensureExercise).mockResolvedValue({
      exercise: { _id: "ex1", name: "Push-ups" } as any,
      created: false,
      exercises: [],
    });
    mockMutation
      .mockResolvedValueOnce("set1") // logSet
      .mockResolvedValueOnce("action1"); // recordLogSetAction
    vi.mocked(buildTodayTotals).mockResolvedValue({
      totalSets: 3,
      totalReps: 30,
      totalDurationSeconds: 0,
      topExercises: [
        {
          exerciseId: "ex1",
          exerciseName: "Push-ups",
          sets: 3,
          reps: 30,
          durationSeconds: 0,
        },
      ],
    });

    const result = await runLogSetTool(
      { exercise_name: "Push-ups", reps: 10 },
      mockCtx
    );

    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.today_totals).toEqual({
      total_sets: 3,
      total_reps: 30,
      exercise_count: 1,
    });
  });

  it("today_totals reflects the just-logged set (post-commit query)", async () => {
    vi.mocked(ensureExercise).mockResolvedValue({
      exercise: { _id: "ex1", name: "Bench Press" } as any,
      created: false,
      exercises: [],
    });
    mockMutation.mockResolvedValueOnce("set1").mockResolvedValueOnce("action1");
    // Simulate: DB now has 5 sets after this log committed
    vi.mocked(buildTodayTotals).mockResolvedValue({
      totalSets: 5,
      totalReps: 50,
      totalDurationSeconds: 0,
      topExercises: [
        {
          exerciseId: "ex1",
          exerciseName: "Bench Press",
          sets: 5,
          reps: 50,
          durationSeconds: 0,
        },
      ],
    });

    const result = await runLogSetTool(
      { exercise_name: "Bench Press", reps: 10 },
      mockCtx
    );

    expect(result.outputForModel.today_totals).toEqual({
      total_sets: 5,
      total_reps: 50,
      exercise_count: 1,
    });
  });

  it("buildTodayTotals is called after mutation commits", async () => {
    let mutationResolved = false;
    vi.mocked(ensureExercise).mockResolvedValue({
      exercise: { _id: "ex1", name: "Push-ups" } as any,
      created: false,
      exercises: [],
    });
    mockMutation.mockImplementation(async () => {
      mutationResolved = true;
      return "set1";
    });
    vi.mocked(buildTodayTotals).mockImplementation(async () => {
      // Verify mutation resolved before totals query
      expect(mutationResolved).toBe(true);
      return {
        totalSets: 1,
        totalReps: 10,
        totalDurationSeconds: 0,
        topExercises: [],
      };
    });

    await runLogSetTool({ exercise_name: "Push-ups", reps: 10 }, mockCtx);

    expect(buildTodayTotals).toHaveBeenCalledWith(mockCtx);
  });
});

describe("LogSetArgsSchema", () => {
  it("passes LLM-provided args through unchanged", () => {
    const llmArgs = {
      exercise_name: "Bench Press",
      reps: 15,
      weight: 45,
      unit: "lbs",
    };

    const parsed = LogSetArgsSchema.parse(llmArgs);

    expect(parsed).toEqual(llmArgs);
  });

  it("preserves weight when only reps are provided", () => {
    const llmArgs = {
      exercise_name: "Squat",
      reps: 5,
      weight: 225,
      unit: "lbs",
    };

    const parsed = LogSetArgsSchema.parse(llmArgs);

    expect(parsed.weight).toBe(225);
    expect(parsed.reps).toBe(5);
  });

  it("accepts duration-based sets", () => {
    const llmArgs = {
      exercise_name: "Plank",
      duration_seconds: 120,
    };

    const parsed = LogSetArgsSchema.parse(llmArgs);

    expect(parsed.duration_seconds).toBe(120);
    expect(parsed.reps).toBeUndefined();
  });

  it("rejects sets without reps or duration", () => {
    expect(() =>
      LogSetArgsSchema.parse({
        exercise_name: "Push-ups",
      })
    ).toThrowError(/Provide exactly one of reps or duration_seconds/);
  });
});
