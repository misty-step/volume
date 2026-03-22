// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachBlock } from "@/lib/coach/schema";
import { getCoachToolNames } from "@/lib/coach/tools/registry";

const mockRunLogSetTool = vi.fn();
const mockRunTodaySummaryTool = vi.fn();
const mockRunWorkoutSessionTool = vi.fn();
const mockRunDateRangeSetsTool = vi.fn();
const mockRunHistoryOverviewTool = vi.fn();
const mockRunExerciseSnapshotTool = vi.fn();
const mockRunExerciseTrendTool = vi.fn();
const mockRunExerciseHistoryTool = vi.fn();
const mockRunFocusSuggestionsTool = vi.fn();
const mockRunSetWeightUnitTool = vi.fn();
const mockRunSetSoundTool = vi.fn();

vi.mock("@/lib/coach/tools/tool-log-set", () => ({
  runLogSetTool: (...args: unknown[]) => mockRunLogSetTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-today-summary", () => ({
  runTodaySummaryTool: (...args: unknown[]) => mockRunTodaySummaryTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-workout-session", () => ({
  runWorkoutSessionTool: (...args: unknown[]) =>
    mockRunWorkoutSessionTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-date-range-sets", () => ({
  runDateRangeSetsTool: (...args: unknown[]) =>
    mockRunDateRangeSetsTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-history-overview", () => ({
  runHistoryOverviewTool: (...args: unknown[]) =>
    mockRunHistoryOverviewTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-exercise-report", () => ({
  runExerciseSnapshotTool: (...args: unknown[]) =>
    mockRunExerciseSnapshotTool(...args),
  runExerciseTrendTool: (...args: unknown[]) =>
    mockRunExerciseTrendTool(...args),
}));

vi.mock("@/lib/coach/tools/tool-exercise-history", () => ({
  runExerciseHistoryTool: (...args: unknown[]) =>
    mockRunExerciseHistoryTool(...args),
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
    mockRunWorkoutSessionTool.mockReset();
    mockRunDateRangeSetsTool.mockReset();
    mockRunHistoryOverviewTool.mockReset();
    mockRunExerciseSnapshotTool.mockReset();
    mockRunExerciseTrendTool.mockReset();
    mockRunExerciseHistoryTool.mockReset();
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

  it("routes query_workouts workout_session actions through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunWorkoutSessionTool.mockResolvedValue({
      summary: "session",
      blocks: [],
      outputForModel: { status: "ok", date: "2026-03-22" },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.query_workouts as any).execute({
      action: "workout_session",
      date: "2026-03-22",
    });

    expect(mockRunWorkoutSessionTool).toHaveBeenCalledWith(
      { date: "2026-03-22" },
      TEST_CTX
    );
    expect(output).toEqual({ status: "ok", date: "2026-03-22" });
  });

  it("routes query_workouts date_range actions through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunDateRangeSetsTool.mockResolvedValue({
      summary: "range",
      blocks: [],
      outputForModel: { status: "ok", days: 3 },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.query_workouts as any).execute({
      action: "date_range",
      start_date: "2026-03-20",
      end_date: "2026-03-22",
    });

    expect(mockRunDateRangeSetsTool).toHaveBeenCalledWith(
      {
        start_date: "2026-03-20",
        end_date: "2026-03-22",
      },
      TEST_CTX
    );
    expect(output).toEqual({ status: "ok", days: 3 });
  });

  it("routes query_workouts history_overview actions through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunHistoryOverviewTool.mockResolvedValue({
      summary: "history",
      blocks: [],
      outputForModel: { status: "ok", shown_sets: 10 },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.query_workouts as any).execute({
      action: "history_overview",
      limit: 10,
    });

    expect(mockRunHistoryOverviewTool).toHaveBeenCalledWith(
      { limit: 10 },
      TEST_CTX
    );
    expect(output).toEqual({ status: "ok", shown_sets: 10 });
  });

  it("omits _uiBlocks when blocks array is empty", async () => {
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

  it("routes query_exercise history actions through the context tool runner", async () => {
    const { createCoachTools } = await import("./coach-tools");

    mockRunExerciseHistoryTool.mockResolvedValue({
      summary: "history",
      blocks: [],
      outputForModel: { status: "ok", entries: 5 },
    });

    const tools = createCoachTools(TEST_CTX);
    const output = await (tools.query_exercise as any).execute({
      action: "history",
      exercise_name: "Push-ups",
      limit: 5,
    });

    expect(mockRunExerciseHistoryTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups", limit: 5 },
      TEST_CTX
    );
    expect(output).toEqual({ status: "ok", entries: 5 });
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
    const toolNames = Object.keys(tools);

    expect(toolNames).toEqual(
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
    for (const legacyToolName of [
      "log_set",
      "get_today_summary",
      "get_exercise_snapshot",
      "rename_exercise",
      "edit_set",
      "set_weight_unit",
    ]) {
      expect(toolNames).not.toContain(legacyToolName);
    }
  });
});
