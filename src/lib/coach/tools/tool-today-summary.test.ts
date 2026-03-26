// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./data", () => ({
  buildTodayTotals: vi.fn(),
}));

import { buildTodayTotals } from "./data";
import { runTodaySummaryTool } from "./tool-today-summary";
import type { CoachToolContext } from "./types";

const mockCtx: CoachToolContext = {
  convex: { query: vi.fn() } as unknown as CoachToolContext["convex"],
  defaultUnit: "lbs",
  timezoneOffsetMinutes: 0,
  turnId: "test-turn",
  userInput: "show today",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runTodaySummaryTool", () => {
  it("empty day -> status block with 'No sets logged today'", async () => {
    vi.mocked(buildTodayTotals).mockResolvedValue({
      totalSets: 0,
      totalReps: 0,
      totalDurationSeconds: 0,
      topExercises: [],
      exerciseCount: 0,
    });
    const result = await runTodaySummaryTool(mockCtx);
    expect(result.blocks[0]?.type).toBe("status");
    expect((result.blocks[0] as { title: string }).title).toMatch(
      /no sets logged today/i
    );
  });

  it("empty day -> outputForModel.status==='ok', total_sets===0", async () => {
    vi.mocked(buildTodayTotals).mockResolvedValue({
      totalSets: 0,
      totalReps: 0,
      totalDurationSeconds: 0,
      topExercises: [],
      exerciseCount: 0,
    });
    const result = await runTodaySummaryTool(mockCtx);
    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.surface).toBe("today_empty");
    expect(result.outputForModel.title).toBe("No sets logged today");
    expect(result.outputForModel.total_sets).toBe(0);
    expect(result.outputForModel.total_duration_seconds).toBe(0);
    expect(result.outputForModel.top_exercises).toEqual([]);
  });

  it("non-empty sets -> first block is metrics", async () => {
    vi.mocked(buildTodayTotals).mockResolvedValue({
      totalSets: 2,
      totalReps: 20,
      totalDurationSeconds: 0,
      topExercises: [
        {
          exerciseId: "ex1",
          exerciseName: "Push-ups",
          sets: 2,
          reps: 20,
          durationSeconds: 0,
        },
      ],
      exerciseCount: 1,
    });
    const result = await runTodaySummaryTool(mockCtx);
    expect(result.blocks[0]?.type).toBe("metrics");
  });

  it("non-empty sets -> includes a table block", async () => {
    vi.mocked(buildTodayTotals).mockResolvedValue({
      totalSets: 2,
      totalReps: 20,
      totalDurationSeconds: 0,
      topExercises: [
        {
          exerciseId: "ex1",
          exerciseName: "Push-ups",
          sets: 2,
          reps: 20,
          durationSeconds: 0,
        },
      ],
      exerciseCount: 1,
    });
    const result = await runTodaySummaryTool(mockCtx);
    const table = result.blocks.find((b) => b.type === "table");
    expect(table).toBeDefined();
  });

  it("non-empty sets -> outputForModel has correct totals", async () => {
    vi.mocked(buildTodayTotals).mockResolvedValue({
      totalSets: 5,
      totalReps: 50,
      totalDurationSeconds: 120,
      topExercises: [
        {
          exerciseId: "ex1",
          exerciseName: "Bench",
          sets: 3,
          reps: 30,
          durationSeconds: 0,
        },
        {
          exerciseId: "ex2",
          exerciseName: "Plank",
          sets: 2,
          reps: 0,
          durationSeconds: 120,
        },
      ],
      exerciseCount: 2,
    });
    const result = await runTodaySummaryTool(mockCtx);
    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.surface).toBe("today_summary");
    expect(result.outputForModel.title).toBe("Today's totals");
    expect(result.outputForModel.total_sets).toBe(5);
    expect(result.outputForModel.total_reps).toBe(50);
    expect(result.outputForModel.total_duration_seconds).toBe(120);
    expect(result.outputForModel.exercise_count).toBe(2);
    expect(result.outputForModel.top_exercises).toEqual([
      {
        exercise_name: "Bench",
        sets: 3,
        reps: 30,
        duration_seconds: null,
      },
      {
        exercise_name: "Plank",
        sets: 2,
        reps: null,
        duration_seconds: 120,
      },
    ]);
  });

  it("exercise_count uses exerciseCount, not truncated topExercises.length", async () => {
    vi.mocked(buildTodayTotals).mockResolvedValue({
      totalSets: 10,
      totalReps: 80,
      totalDurationSeconds: 120,
      topExercises: [
        {
          exerciseId: "a",
          exerciseName: "Bench",
          sets: 3,
          reps: 30,
          durationSeconds: 0,
        },
        {
          exerciseId: "b",
          exerciseName: "Squat",
          sets: 3,
          reps: 25,
          durationSeconds: 0,
        },
        {
          exerciseId: "c",
          exerciseName: "Curl",
          sets: 2,
          reps: 15,
          durationSeconds: 0,
        },
        {
          exerciseId: "d",
          exerciseName: "Plank",
          sets: 1,
          reps: 0,
          durationSeconds: 120,
        },
      ],
      exerciseCount: 6, // More than 4 topExercises entries
    });
    const result = await runTodaySummaryTool(mockCtx);
    // outputForModel uses full count, not truncated
    expect(result.outputForModel.exercise_count).toBe(6);
    // UI block also shows full count
    const metrics = result.blocks.find((b) => b.type === "metrics") as any;
    const exerciseMetric = metrics.metrics.find(
      (m: any) => m.label === "Exercises"
    );
    expect(exerciseMetric.value).toBe("6");
  });

  it("uses buildTodayTotals as single source of truth", async () => {
    vi.mocked(buildTodayTotals).mockResolvedValue({
      totalSets: 0,
      totalReps: 0,
      totalDurationSeconds: 0,
      topExercises: [],
      exerciseCount: 0,
    });
    await runTodaySummaryTool(mockCtx);
    expect(buildTodayTotals).toHaveBeenCalledWith(mockCtx);
  });
});
