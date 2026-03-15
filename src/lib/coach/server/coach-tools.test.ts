// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachBlock } from "@/lib/coach/schema";
import { getCoachToolNames } from "@/lib/coach/tools/registry";

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

  it("includes _uiBlocks in tool output when blocks are present", async () => {
    const { createCoachTools } = await import("./coach-tools");
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

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.log_set as any).execute({
      exercise_name: "Push-ups",
      reps: 10,
    });

    expect(output).toMatchObject({ status: "ok" });
    expect(output._uiBlocks).toEqual(toolBlocks);
  });

  it("includes _uiBlocks error block and error output when a runner throws", async () => {
    const { createCoachTools } = await import("./coach-tools");
    mockRunLogSetTool.mockRejectedValue(new Error("boom"));

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.log_set as any).execute({
      exercise_name: "Push-ups",
      reps: 10,
    });

    expect(output.error).toBe("boom");
    expect(output._uiBlocks).toEqual(
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

  it("supports tools with empty input schemas and includes _uiBlocks", async () => {
    const { createCoachTools } = await import("./coach-tools");
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

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.get_today_summary as any).execute({});

    expect(mockRunTodaySummaryTool).toHaveBeenCalledWith(TEST_CTX);
    expect(output).toMatchObject({ total_sets: 5 });
    expect(output._uiBlocks).toEqual(toolBlocks);
  });

  it("omits _uiBlocks when blocks array is empty", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunSetWeightUnitTool.mockReturnValue({
      summary: "unit set",
      blocks: [],
      outputForModel: { status: "ok", unit: "kg" },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.set_weight_unit as any).execute({ unit: "kg" });

    expect(mockRunSetWeightUnitTool).toHaveBeenCalledWith({ unit: "kg" });
    expect(output).toEqual({ status: "ok", unit: "kg" });
    expect(output._uiBlocks).toBeUndefined();
  });

  it("routes set_sound through the no-context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunSetSoundTool.mockReturnValue({
      summary: "sound set",
      blocks: [],
      outputForModel: { status: "ok", enabled: true },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.set_sound as any).execute({ enabled: true });

    expect(mockRunSetSoundTool).toHaveBeenCalledWith({ enabled: true });
    expect(output).toEqual({ status: "ok", enabled: true });
  });

  it("routes get_exercise_snapshot through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunExerciseSnapshotTool.mockResolvedValue({
      summary: "snapshot",
      blocks: [],
      outputForModel: { status: "ok", total_sets: 4 },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.get_exercise_snapshot as any).execute({
      exercise_name: "Push-ups",
    });

    expect(mockRunExerciseSnapshotTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups" },
      TEST_CTX
    );
    expect(output).toEqual({ status: "ok", total_sets: 4 });
  });

  it("routes get_exercise_trend through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunExerciseTrendTool.mockResolvedValue({
      summary: "trend",
      blocks: [],
      outputForModel: { status: "ok", trend_metric: "reps" },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.get_exercise_trend as any).execute({
      exercise_name: "Push-ups",
    });

    expect(mockRunExerciseTrendTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups" },
      TEST_CTX
    );
    expect(output).toEqual({ status: "ok", trend_metric: "reps" });
  });

  it("routes get_focus_suggestions through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunFocusSuggestionsTool.mockResolvedValue({
      summary: "focus",
      blocks: [],
      outputForModel: { status: "ok", suggestions: [] },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.get_focus_suggestions as any).execute({});

    expect(mockRunFocusSuggestionsTool).toHaveBeenCalledWith(TEST_CTX);
    expect(output).toEqual({ status: "ok", suggestions: [] });
  });

  it("exposes the same tool names as the shared registry", async () => {
    const { createCoachTools } = await import("./coach-tools");

    const tools = createCoachTools(TEST_CTX);

    expect(Object.keys(tools).sort()).toEqual(getCoachToolNames().sort());
  });
});
