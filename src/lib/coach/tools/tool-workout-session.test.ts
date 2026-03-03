// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runWorkoutSessionTool } from "./tool-workout-session";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    sets: {
      listSetsForDateRange: "sets.listSetsForDateRange",
    },
  },
}));

vi.mock("./data", () => ({
  listExercises: vi.fn(),
}));

import { listExercises } from "./data";

const mockListExercises = vi.mocked(listExercises);
const query = vi.fn();

const TEST_CTX = {
  convex: { query },
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

function makeExercise(id: string, name: string) {
  return { _id: id, name, userId: "user_1", createdAt: Date.now() };
}

function makeSet(overrides: Record<string, unknown> = {}) {
  return {
    _id: "set_1",
    userId: "user_1",
    exerciseId: "exercise_1",
    reps: 10,
    performedAt: Date.now(),
    ...overrides,
  };
}

describe("runWorkoutSessionTool", () => {
  beforeEach(() => {
    query.mockReset();
    mockListExercises.mockReset();
  });

  it("returns metrics + entity_list for a session with sets", async () => {
    const ex = makeExercise("exercise_1", "Bench Press");
    mockListExercises.mockResolvedValue([ex] as any);
    query.mockResolvedValue([
      makeSet({ _id: "set_1", reps: 10, exerciseId: "exercise_1" }),
      makeSet({ _id: "set_2", reps: 8, exerciseId: "exercise_1" }),
    ] as any);

    const result = await runWorkoutSessionTool(
      { date: "2024-01-15" },
      TEST_CTX as any
    );

    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.total_sets).toBe(2);
    expect(result.outputForModel.total_reps).toBe(18);
    expect(result.outputForModel.exercise_count).toBe(1);

    const blocks = result.blocks;
    expect(blocks[0]?.type).toBe("metrics");
    expect(blocks[1]?.type).toBe("entity_list");
  });

  it("returns info status when no sets logged", async () => {
    mockListExercises.mockResolvedValue([]);
    query.mockResolvedValue([]);

    const result = await runWorkoutSessionTool(
      { date: "2024-01-15" },
      TEST_CTX as any
    );

    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.total_sets).toBe(0);
    expect((result.blocks[0] as any).type).toBe("status");
    expect((result.blocks[0] as any).tone).toBe("info");
  });

  it("defaults to today when date not provided", async () => {
    mockListExercises.mockResolvedValue([]);
    query.mockResolvedValue([]);

    await runWorkoutSessionTool({}, TEST_CTX as any);

    expect(query).toHaveBeenCalledWith("sets.listSetsForDateRange", {
      startDate: expect.any(Number),
      endDate: expect.any(Number),
    });
  });

  it("sums duration totals correctly", async () => {
    const ex = makeExercise("exercise_1", "Plank");
    mockListExercises.mockResolvedValue([ex] as any);
    query.mockResolvedValue([
      makeSet({
        _id: "set_1",
        reps: undefined,
        duration: 60,
        exerciseId: "exercise_1",
      }),
      makeSet({
        _id: "set_2",
        reps: undefined,
        duration: 90,
        exerciseId: "exercise_1",
      }),
    ] as any);

    const result = await runWorkoutSessionTool(
      { date: "2024-01-15" },
      TEST_CTX as any
    );

    expect(result.outputForModel.total_duration_seconds).toBe(150);
    expect(result.outputForModel.total_reps).toBe(0);
  });

  it("includes set_ids in outputForModel", async () => {
    const ex = makeExercise("exercise_1", "Squat");
    mockListExercises.mockResolvedValue([ex] as any);
    query.mockResolvedValue([
      makeSet({ _id: "set_abc", reps: 5 }),
      makeSet({ _id: "set_def", reps: 5 }),
    ] as any);

    const result = await runWorkoutSessionTool(
      { date: "2024-01-15" },
      TEST_CTX as any
    );

    expect(result.outputForModel.set_ids).toEqual(["set_abc", "set_def"]);
  });
});
