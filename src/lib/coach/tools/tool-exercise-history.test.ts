// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runExerciseHistoryTool } from "./tool-exercise-history";
import { resolveExercise, getRecentExerciseSets } from "./data";

vi.mock("@/../convex/_generated/api", () => ({
  api: {},
}));

vi.mock("./data", () => ({
  resolveExercise: vi.fn(),
  getRecentExerciseSets: vi.fn(),
}));

const mockResolveExercise = vi.mocked(resolveExercise);
const mockGetRecentExerciseSets = vi.mocked(getRecentExerciseSets);

const TEST_CTX = {
  convex: {},
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
  };
}

function makeSet(overrides: Record<string, unknown> = {}) {
  return {
    _id: "set_1",
    userId: "user_1",
    exerciseId: "exercise_1",
    reps: 10,
    weight: 135,
    unit: "lbs",
    performedAt: new Date("2024-01-15").getTime(),
    ...overrides,
  };
}

describe("runExerciseHistoryTool", () => {
  beforeEach(() => {
    mockResolveExercise.mockReset();
    mockGetRecentExerciseSets.mockReset();
  });

  it("returns entity_list with sets for known exercise", async () => {
    const ex = makeExercise();
    mockResolveExercise.mockResolvedValue({ exercise: ex, exercises: [ex] });
    mockGetRecentExerciseSets.mockResolvedValue([
      makeSet({ _id: "set_1", reps: 10, weight: 135 }),
      makeSet({
        _id: "set_2",
        reps: 8,
        weight: 145,
        performedAt: new Date("2024-01-14").getTime(),
      }),
    ] as any);

    const result = await runExerciseHistoryTool(
      { exercise_name: "bench press" },
      TEST_CTX as any
    );

    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.exercise_name).toBe("Bench Press");
    expect(result.outputForModel.sets_found).toBe(2);
    expect((result.outputForModel.set_ids as string[]).length).toBe(2);
    expect((result.blocks[0] as any).type).toBe("entity_list");
    expect((result.blocks[0] as any).items).toHaveLength(2);
  });

  it("returns exercise_not_found for unknown exercise", async () => {
    mockResolveExercise.mockResolvedValue({ exercise: null, exercises: [] });

    const result = await runExerciseHistoryTool(
      { exercise_name: "Nope" },
      TEST_CTX as any
    );

    expect(result.outputForModel).toEqual({
      status: "error",
      error: "exercise_not_found",
    });
    expect((result.blocks[0] as any).title).toBe("Exercise not found");
  });

  it("returns empty entity_list when no sets logged", async () => {
    const ex = makeExercise();
    mockResolveExercise.mockResolvedValue({ exercise: ex, exercises: [ex] });
    mockGetRecentExerciseSets.mockResolvedValue([]);

    const result = await runExerciseHistoryTool(
      { exercise_name: "Bench Press" },
      TEST_CTX as any
    );

    expect(result.outputForModel.sets_found).toBe(0);
    expect((result.blocks[0] as any).items).toHaveLength(0);
  });

  it("respects limit param", async () => {
    const ex = makeExercise();
    mockResolveExercise.mockResolvedValue({ exercise: ex, exercises: [ex] });
    const manySets = Array.from({ length: 50 }, (_, i) =>
      makeSet({ _id: `set_${i}`, reps: 10 })
    );
    mockGetRecentExerciseSets.mockResolvedValue(manySets as any);

    const result = await runExerciseHistoryTool(
      { exercise_name: "Bench Press", limit: 5 },
      TEST_CTX as any
    );

    expect(result.outputForModel.sets_found).toBe(5);
    expect((result.blocks[0] as any).items).toHaveLength(5);
  });

  it("formats duration sets correctly", async () => {
    const ex = makeExercise();
    mockResolveExercise.mockResolvedValue({ exercise: ex, exercises: [ex] });
    mockGetRecentExerciseSets.mockResolvedValue([
      makeSet({
        _id: "set_1",
        reps: undefined,
        weight: undefined,
        duration: 90,
      }),
    ] as any);

    const result = await runExerciseHistoryTool(
      { exercise_name: "Bench Press" },
      TEST_CTX as any
    );

    const item = (result.blocks[0] as any).items[0];
    expect(item.title).toBe("1:30");
  });
});
