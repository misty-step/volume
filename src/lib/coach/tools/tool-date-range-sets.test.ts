// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDateRangeSetsTool } from "./tool-date-range-sets";

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
    performedAt: new Date("2024-01-15T12:00:00Z").getTime(),
    ...overrides,
  };
}

describe("runDateRangeSetsTool", () => {
  beforeEach(() => {
    query.mockReset();
    mockListExercises.mockReset();
  });

  it("groups sets by day and returns entity_list", async () => {
    const ex = makeExercise("exercise_1", "Bench Press");
    mockListExercises.mockResolvedValue([ex] as any);

    const day1 = new Date("2024-01-15T10:00:00Z").getTime();
    const day2 = new Date("2024-01-16T10:00:00Z").getTime();

    query.mockResolvedValue([
      makeSet({ _id: "set_1", performedAt: day1 }),
      makeSet({ _id: "set_2", performedAt: day2 }),
    ] as any);

    const result = await runDateRangeSetsTool(
      { start_date: "2024-01-15", end_date: "2024-01-16" },
      TEST_CTX as any
    );

    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.total_sets).toBe(2);
    expect(result.outputForModel.days_count).toBe(2);
    expect((result.blocks[0] as any).type).toBe("entity_list");
  });

  it("returns empty entity_list when no sets found", async () => {
    mockListExercises.mockResolvedValue([]);
    query.mockResolvedValue([]);

    const result = await runDateRangeSetsTool(
      { start_date: "2024-01-01", end_date: "2024-01-07" },
      TEST_CTX as any
    );

    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.total_sets).toBe(0);
    expect(result.outputForModel.days_count).toBe(0);
  });

  it("returns error for invalid date range (start after end)", async () => {
    const result = await runDateRangeSetsTool(
      { start_date: "2024-01-10", end_date: "2024-01-01" },
      TEST_CTX as any
    );

    expect(result.outputForModel).toEqual({
      status: "error",
      error: "invalid_date_range",
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("passes correct timestamp range to Convex query", async () => {
    mockListExercises.mockResolvedValue([]);
    query.mockResolvedValue([]);

    await runDateRangeSetsTool(
      { start_date: "2024-01-15", end_date: "2024-01-15" },
      TEST_CTX as any
    );

    expect(query).toHaveBeenCalledWith("sets.listSetsForDateRange", {
      startDate: expect.any(Number),
      endDate: expect.any(Number),
    });

    const callArgs = query.mock.calls[0][1];
    expect(callArgs.endDate).toBeGreaterThan(callArgs.startDate);
  });
});
