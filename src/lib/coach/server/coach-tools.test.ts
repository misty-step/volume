// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachBlock } from "@/lib/coach/schema";

const mockRunLogSetTool = vi.fn();
const mockRunTodaySummaryTool = vi.fn();
const mockRunExerciseSnapshotTool = vi.fn();
const mockRunExerciseTrendTool = vi.fn();
const mockRunFocusSuggestionsTool = vi.fn();
const mockRunSetWeightUnitTool = vi.fn();
const mockRunSetSoundTool = vi.fn();

vi.mock("@/lib/coach/tools/tool-log-set", () => ({
  runLogSetTool: (...args: unknown[]) => mockRunLogSetTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-today-summary", () => ({
  runTodaySummaryTool: (...args: unknown[]) => mockRunTodaySummaryTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-exercise-report", () => ({
  runExerciseSnapshotTool: (...args: unknown[]) =>
    mockRunExerciseSnapshotTool(...args),
  runExerciseTrendTool: (...args: unknown[]) =>
    mockRunExerciseTrendTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-focus-suggestions", () => ({
  runFocusSuggestionsTool: (...args: unknown[]) =>
    mockRunFocusSuggestionsTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-set-weight-unit", () => ({
  runSetWeightUnitTool: (...args: unknown[]) =>
    mockRunSetWeightUnitTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-set-sound", () => ({
  runSetSoundTool: (...args: unknown[]) => mockRunSetSoundTool(...args),
}));

const TEST_CTX = {
  convex: {} as any,
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

describe("createCoachTools", () => {
  beforeEach(() => {
    mockRunLogSetTool.mockReset();
    mockRunTodaySummaryTool.mockReset();
    mockRunExerciseSnapshotTool.mockReset();
    mockRunExerciseTrendTool.mockReset();
    mockRunFocusSuggestionsTool.mockReset();
    mockRunSetWeightUnitTool.mockReset();
    mockRunSetSoundTool.mockReset();
  });

  it("passes tool blocks through onBlocks", async () => {
    const { createCoachTools } = await import("./coach-tools");
    const onBlocks = vi.fn();
    const toolBlocks: CoachBlock[] = [
      {
        type: "status",
        tone: "success",
        title: "Logged",
        description: "ok",
      },
    ];

    mockRunLogSetTool.mockResolvedValue({
      summary: "logged",
      blocks: toolBlocks,
      outputForModel: { status: "ok" },
    });

    const tools = createCoachTools(TEST_CTX, { onBlocks });
    const output = await (tools.log_set as any).execute({
      exercise_name: "Push-ups",
      reps: 10,
    });

    expect(mockRunLogSetTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups", reps: 10 },
      TEST_CTX
    );
    expect(onBlocks).toHaveBeenCalledWith("log_set", toolBlocks);
    expect(output).toMatchObject({ status: "ok" });
    expect(output._blocks).toEqual([{ type: "status", title: "Logged" }]);
  });

  it("emits tool failure blocks and error output when a runner throws", async () => {
    const { createCoachTools } = await import("./coach-tools");
    const onBlocks = vi.fn();
    mockRunLogSetTool.mockRejectedValue(new Error("boom"));

    const tools = createCoachTools(TEST_CTX, { onBlocks });
    const output = await (tools.log_set as any).execute({
      exercise_name: "Push-ups",
      reps: 10,
    });

    expect(output).toEqual({ error: "boom" });
    expect(onBlocks).toHaveBeenCalledWith(
      "log_set",
      expect.arrayContaining([
        expect.objectContaining({
          type: "status",
          tone: "error",
          title: "Tool failed",
          description: "boom",
        }),
      ])
    );
  });

  it("supports tools with empty input schemas", async () => {
    const { createCoachTools } = await import("./coach-tools");
    const onBlocks = vi.fn();
    const toolBlocks: CoachBlock[] = [
      {
        type: "metrics",
        title: "Today",
        metrics: [{ label: "Sets", value: "5" }],
      },
    ];

    mockRunTodaySummaryTool.mockResolvedValue({
      summary: "summary",
      blocks: toolBlocks,
      outputForModel: { total_sets: 5 },
    });

    const tools = createCoachTools(TEST_CTX, { onBlocks });
    const output = await (tools.get_today_summary as any).execute({});

    expect(mockRunTodaySummaryTool).toHaveBeenCalledWith(TEST_CTX);
    expect(onBlocks).toHaveBeenCalledWith("get_today_summary", toolBlocks);
    expect(output).toMatchObject({ total_sets: 5 });
    expect(output._blocks).toEqual([{ type: "metrics", title: "Today" }]);
  });

  it("routes set_weight_unit through the no-context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");
    const onBlocks = vi.fn();

    mockRunSetWeightUnitTool.mockReturnValue({
      summary: "unit set",
      blocks: [],
      outputForModel: { status: "ok", unit: "kg" },
    });

    const tools = createCoachTools(TEST_CTX, { onBlocks });
    const output = await (tools.set_weight_unit as any).execute({ unit: "kg" });

    expect(mockRunSetWeightUnitTool).toHaveBeenCalledWith({ unit: "kg" });
    expect(onBlocks).toHaveBeenCalledWith("set_weight_unit", []);
    expect(output).toEqual({ status: "ok", unit: "kg" });
  });

  it("routes set_sound through the no-context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");
    const onBlocks = vi.fn();

    mockRunSetSoundTool.mockReturnValue({
      summary: "sound set",
      blocks: [],
      outputForModel: { status: "ok", enabled: true },
    });

    const tools = createCoachTools(TEST_CTX, { onBlocks });
    const output = await (tools.set_sound as any).execute({ enabled: true });

    expect(mockRunSetSoundTool).toHaveBeenCalledWith({ enabled: true });
    expect(onBlocks).toHaveBeenCalledWith("set_sound", []);
    expect(output).toEqual({ status: "ok", enabled: true });
  });

  it("routes get_exercise_snapshot through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");
    const onBlocks = vi.fn();
    const toolBlocks: CoachBlock[] = [];

    mockRunExerciseSnapshotTool.mockResolvedValue({
      summary: "snapshot",
      blocks: toolBlocks,
      outputForModel: { status: "ok", total_sets: 4 },
    });

    const tools = createCoachTools(TEST_CTX, { onBlocks });
    const output = await (tools.get_exercise_snapshot as any).execute({
      exercise_name: "Push-ups",
    });

    expect(mockRunExerciseSnapshotTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups" },
      TEST_CTX
    );
    expect(onBlocks).toHaveBeenCalledWith("get_exercise_snapshot", toolBlocks);
    expect(output).toEqual({ status: "ok", total_sets: 4 });
  });

  it("routes get_exercise_trend through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");
    const onBlocks = vi.fn();
    const toolBlocks: CoachBlock[] = [];

    mockRunExerciseTrendTool.mockResolvedValue({
      summary: "trend",
      blocks: toolBlocks,
      outputForModel: { status: "ok", trend_metric: "reps" },
    });

    const tools = createCoachTools(TEST_CTX, { onBlocks });
    const output = await (tools.get_exercise_trend as any).execute({
      exercise_name: "Push-ups",
    });

    expect(mockRunExerciseTrendTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups" },
      TEST_CTX
    );
    expect(onBlocks).toHaveBeenCalledWith("get_exercise_trend", toolBlocks);
    expect(output).toEqual({ status: "ok", trend_metric: "reps" });
  });

  it("routes get_focus_suggestions through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");
    const onBlocks = vi.fn();
    const toolBlocks: CoachBlock[] = [];

    mockRunFocusSuggestionsTool.mockResolvedValue({
      summary: "focus",
      blocks: toolBlocks,
      outputForModel: { status: "ok", suggestions: [] },
    });

    const tools = createCoachTools(TEST_CTX, { onBlocks });
    const output = await (tools.get_focus_suggestions as any).execute({});

    expect(mockRunFocusSuggestionsTool).toHaveBeenCalledWith(TEST_CTX);
    expect(onBlocks).toHaveBeenCalledWith("get_focus_suggestions", toolBlocks);
    expect(output).toEqual({ status: "ok", suggestions: [] });
  });
});
