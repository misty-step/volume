import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./data", () => ({
  getTodaySets: vi.fn(),
  listExercises: vi.fn(),
}));

import { getTodaySets, listExercises } from "./data";
import { runTodaySummaryTool } from "./tool-today-summary";
import type { CoachToolContext } from "./types";

const mockCtx: CoachToolContext = {
  convex: { query: vi.fn() } as unknown as CoachToolContext["convex"],
  defaultUnit: "lbs",
  timezoneOffsetMinutes: 0,
  turnId: "test-turn",
  userInput: "show today",
};

const sampleExercise = { _id: "ex1", name: "Pushups" };
const sampleSet = {
  _id: "set1",
  exerciseId: "ex1",
  reps: 10,
  weight: 100,
  unit: "lbs",
  performedAt: Date.now(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listExercises).mockResolvedValue([sampleExercise] as ReturnType<
    typeof listExercises
  > extends Promise<infer T>
    ? T
    : never);
});

describe("runTodaySummaryTool", () => {
  it("empty sets -> first block is status with 'No sets logged today'", async () => {
    vi.mocked(getTodaySets).mockResolvedValue([]);
    const result = await runTodaySummaryTool(mockCtx);
    expect(result.blocks[0]?.type).toBe("status");
    expect((result.blocks[0] as { title: string }).title).toMatch(
      /no sets logged today/i
    );
  });

  it("empty sets -> outputForModel.status==='ok', total_sets===0", async () => {
    vi.mocked(getTodaySets).mockResolvedValue([]);
    const result = await runTodaySummaryTool(mockCtx);
    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.total_sets).toBe(0);
  });

  it("non-empty sets -> first block is metrics", async () => {
    vi.mocked(getTodaySets).mockResolvedValue([sampleSet] as ReturnType<
      typeof getTodaySets
    > extends Promise<infer T>
      ? T
      : never);
    const result = await runTodaySummaryTool(mockCtx);
    expect(result.blocks[0]?.type).toBe("metrics");
  });

  it("non-empty sets -> includes a table block", async () => {
    vi.mocked(getTodaySets).mockResolvedValue([sampleSet] as ReturnType<
      typeof getTodaySets
    > extends Promise<infer T>
      ? T
      : never);
    const result = await runTodaySummaryTool(mockCtx);
    const table = result.blocks.find((b) => b.type === "table");
    expect(table).toBeDefined();
  });

  it("non-empty sets -> outputForModel.status==='ok' and total_sets>0", async () => {
    vi.mocked(getTodaySets).mockResolvedValue([sampleSet] as ReturnType<
      typeof getTodaySets
    > extends Promise<infer T>
      ? T
      : never);
    const result = await runTodaySummaryTool(mockCtx);
    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.total_sets).toBeGreaterThan(0);
  });

  it("exercises are used to resolve names", async () => {
    vi.mocked(getTodaySets).mockResolvedValue([sampleSet] as ReturnType<
      typeof getTodaySets
    > extends Promise<infer T>
      ? T
      : never);
    const result = await runTodaySummaryTool(mockCtx);
    expect(listExercises).toHaveBeenCalledWith(mockCtx);
    expect(result.summary).toBeDefined();
  });
});
