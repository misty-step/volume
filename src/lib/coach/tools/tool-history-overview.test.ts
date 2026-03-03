// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runHistoryOverviewTool } from "./tool-history-overview";
import { listExercises } from "./data";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    sets: {
      listSets: "sets.listSets",
    },
  },
}));

vi.mock("./data", () => ({
  listExercises: vi.fn(),
}));

const mockListExercises = vi.mocked(listExercises);
const query = vi.fn();

const TEST_CTX = {
  convex: { query },
  defaultUnit: "kg" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

describe("runHistoryOverviewTool", () => {
  beforeEach(() => {
    query.mockReset();
    mockListExercises.mockReset();
  });

  it("builds history rows for duration, reps-only, and weighted sets", async () => {
    const now = Date.now();
    query.mockResolvedValue([
      {
        _id: "set1",
        exerciseId: "ex1",
        duration: 125,
        performedAt: now,
      },
      {
        _id: "set2",
        exerciseId: "ex2",
        reps: 12,
        performedAt: now - 1_000,
      },
      {
        _id: "set3",
        exerciseId: "missing_ex",
        reps: 8,
        weight: 100,
        performedAt: now - 2_000,
      },
    ]);
    mockListExercises.mockResolvedValue([
      { _id: "ex1", name: "Plank" },
      { _id: "ex2", name: "Push Ups" },
    ] as any);

    const result = await runHistoryOverviewTool({}, TEST_CTX as any);

    expect(query).toHaveBeenCalledWith("sets.listSets", {});

    const detailPanel = result.blocks[0] as any;
    const entityList = result.blocks[1] as any;

    expect(detailPanel.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Recent sets shown", value: "3" }),
        expect.objectContaining({ label: "Total reps", value: "20" }),
        expect.objectContaining({ label: "Total duration", value: "2:05" }),
      ])
    );
    expect(entityList.items[0].title).toBe("Plank");
    expect(entityList.items[0].subtitle).toContain("2:05");
    expect(entityList.items[1].subtitle).toContain("12 reps");
    expect(entityList.items[2].title).toBe("Unknown exercise");
    expect(entityList.items[2].subtitle).toContain("8 reps @ 100 kg");
    expect(result.outputForModel).toEqual({
      status: "ok",
      shown_sets: 3,
      total_reps: 20,
      total_duration_seconds: 125,
      set_ids: ["set1", "set2", "set3"],
    });
  });

  it("applies provided limit when slicing sets", async () => {
    const sets = Array.from({ length: 8 }, (_, index) => ({
      _id: `set${index + 1}`,
      exerciseId: "ex1",
      reps: 5,
      performedAt: Date.now() - index,
    }));
    query.mockResolvedValue(sets);
    mockListExercises.mockResolvedValue([{ _id: "ex1", name: "Squat" }] as any);

    const result = await runHistoryOverviewTool({ limit: 5 }, TEST_CTX as any);

    expect(result.outputForModel.shown_sets).toBe(5);
    expect((result.blocks[1] as any).items).toHaveLength(5);
  });
});
