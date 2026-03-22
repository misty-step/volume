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

  it("returns semantic tool output and captures execution records", async () => {
    const { createCoachTools } = await import("./coach-tools");
    const onToolResult = vi.fn();
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

    const tools = createCoachTools(TEST_CTX, { onToolResult });
    const output = await (tools.log_sets as any).execute({
      action: "log_set",
      set: { exercise_name: "Push-ups", reps: 10 },
    });

    expect(output).toEqual({ status: "ok" });
    expect(onToolResult).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "log_set",
        summary: "logged",
        outputForModel: { status: "ok" },
        legacyBlocks: toolBlocks,
      })
    );
  });

  it("returns semantic error output when a runner throws", async () => {
    const { createCoachTools } = await import("./coach-tools");
    mockRunLogSetTool.mockRejectedValue(new Error("boom"));

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.log_sets as any).execute({
      sets: [{ exercise_name: "Push-ups", reps: 10 }],
    });

    expect(output).toEqual({
      status: "error",
      error: "boom",
    });
  });

  it("supports tools with empty input schemas", async () => {
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
    const output = await (tools.query_workouts as any).execute({
      action: "today_summary",
    });

    expect(mockRunTodaySummaryTool).toHaveBeenCalledWith(TEST_CTX);
    expect(output).toMatchObject({ total_sets: 5 });
  });

  it("omits legacy UI details from planner tool output", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunSetWeightUnitTool.mockReturnValue({
      summary: "unit set",
      blocks: [],
      outputForModel: { status: "ok", unit: "kg" },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.update_settings as any).execute({
      action: "weight_unit",
      unit: "kg",
    });

    expect(mockRunSetWeightUnitTool).toHaveBeenCalledWith({ unit: "kg" });
    expect(output).toEqual({ status: "ok", unit: "kg" });
  });

  it("routes update_settings sound actions through the no-context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunSetSoundTool.mockReturnValue({
      summary: "sound set",
      blocks: [],
      outputForModel: { status: "ok", enabled: true },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.update_settings as any).execute({
      action: "sound",
      enabled: true,
    });

    expect(mockRunSetSoundTool).toHaveBeenCalledWith({ enabled: true });
    expect(output).toEqual({ status: "ok", enabled: true });
  });

  it("routes query_exercise snapshot actions through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunExerciseSnapshotTool.mockResolvedValue({
      summary: "snapshot",
      blocks: [],
      outputForModel: { status: "ok", total_sets: 4 },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.query_exercise as any).execute({
      action: "snapshot",
      exercise_name: "Push-ups",
    });

    expect(mockRunExerciseSnapshotTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups" },
      TEST_CTX
    );
    expect(output).toEqual({ status: "ok", total_sets: 4 });
  });

  it("routes query_exercise trend actions through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunExerciseTrendTool.mockResolvedValue({
      summary: "trend",
      blocks: [],
      outputForModel: { status: "ok", trend_metric: "reps" },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.query_exercise as any).execute({
      action: "trend",
      exercise_name: "Push-ups",
    });

    expect(mockRunExerciseTrendTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups" },
      TEST_CTX
    );
    expect(output).toEqual({ status: "ok", trend_metric: "reps" });
  });

  it("routes get_insights focus actions through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunFocusSuggestionsTool.mockResolvedValue({
      summary: "focus",
      blocks: [],
      outputForModel: { status: "ok", suggestions: [] },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.get_insights as any).execute({
      action: "focus_suggestions",
    });

    expect(mockRunFocusSuggestionsTool).toHaveBeenCalledWith(TEST_CTX);
    expect(output).toEqual({ status: "ok", suggestions: [] });
  });

  it("exposes the same tool names as the shared registry", async () => {
    const { createCoachTools } = await import("./coach-tools");

    const tools = createCoachTools(TEST_CTX);

    expect(Object.keys(tools).sort()).toEqual(getCoachToolNames().sort());
  });

  it("exposes canonical grouped tools instead of legacy leaf names", async () => {
    const { createCoachTools } = await import("./coach-tools");

    const tools = createCoachTools(TEST_CTX);

    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        "log_sets",
        "query_workouts",
        "query_exercise",
        "manage_exercise",
        "modify_set",
        "update_settings",
        "get_insights",
      ])
    );
    expect(Object.keys(tools)).not.toEqual(
      expect.arrayContaining([
        "log_set",
        "get_today_summary",
        "get_exercise_snapshot",
        "rename_exercise",
        "edit_set",
        "set_weight_unit",
      ])
    );
  });
});
