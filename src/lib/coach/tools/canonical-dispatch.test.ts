// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunLogSetTool = vi.fn();
const mockRunBulkLogTool = vi.fn();
const mockRunTodaySummaryTool = vi.fn();
const mockRunExerciseTrendTool = vi.fn();
const mockRunDeleteSetTool = vi.fn();
const mockRunSetSoundTool = vi.fn();
const mockRunFocusSuggestionsTool = vi.fn();
const mockResolveExercise = vi.fn();
const mockMutation = vi.fn();

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    exercises: {
      updateExercise: "exercises.updateExercise",
    },
  },
}));

vi.mock("./tool-log-set", () => ({
  runLogSetTool: (...args: unknown[]) => mockRunLogSetTool(...args),
}));

vi.mock("./tool-bulk-log", () => ({
  runBulkLogTool: (...args: unknown[]) => mockRunBulkLogTool(...args),
}));

vi.mock("./tool-today-summary", () => ({
  runTodaySummaryTool: (...args: unknown[]) => mockRunTodaySummaryTool(...args),
}));

vi.mock("./tool-exercise-report", () => ({
  runExerciseSnapshotTool: vi.fn(),
  runExerciseTrendTool: (...args: unknown[]) =>
    mockRunExerciseTrendTool(...args),
}));

vi.mock("./data", async () => {
  const actual = await vi.importActual<typeof import("./data")>("./data");
  return {
    ...actual,
    resolveExercise: (...args: unknown[]) => mockResolveExercise(...args),
  };
});

vi.mock("./tool-delete-set", () => ({
  runDeleteSetTool: (...args: unknown[]) => mockRunDeleteSetTool(...args),
}));

vi.mock("./tool-set-sound", () => ({
  runSetSoundTool: (...args: unknown[]) => mockRunSetSoundTool(...args),
}));

vi.mock("./tool-focus-suggestions", () => ({
  runFocusSuggestionsTool: (...args: unknown[]) =>
    mockRunFocusSuggestionsTool(...args),
}));

const TEST_CTX = {
  convex: { mutation: mockMutation } as any,
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

const OK_RESULT = {
  summary: "ok",
  blocks: [],
  outputForModel: { status: "ok" },
};

describe("canonical tool dispatch", () => {
  beforeEach(() => {
    mockRunLogSetTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunBulkLogTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunTodaySummaryTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunExerciseTrendTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunDeleteSetTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunSetSoundTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunFocusSuggestionsTool.mockReset().mockResolvedValue(OK_RESULT);
    mockResolveExercise.mockReset().mockResolvedValue({
      exercise: {
        _id: "exercise_1",
        name: "Bench Press",
        userId: "user_1",
        createdAt: Date.now(),
      },
      exercises: [],
      closeMatches: [],
    });
    mockMutation.mockReset().mockResolvedValue(undefined);
  });

  it("routes single-item log_sets calls to runLogSetTool", async () => {
    const { runLogSetsTool } = await import("./tool-log-sets");

    await runLogSetsTool(
      { sets: [{ exercise_name: "Push-ups", reps: 12 }] },
      TEST_CTX as any
    );

    expect(mockRunLogSetTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups", reps: 12 },
      TEST_CTX
    );
    expect(mockRunBulkLogTool).not.toHaveBeenCalled();
  });

  it("routes query_workouts today_summary calls to runTodaySummaryTool", async () => {
    const { runQueryWorkoutsTool } = await import("./tool-query-workouts");

    await runQueryWorkoutsTool({ action: "today_summary" }, TEST_CTX as any);

    expect(mockRunTodaySummaryTool).toHaveBeenCalledWith(TEST_CTX);
  });

  it("routes query_exercise trend calls to runExerciseTrendTool", async () => {
    const { runQueryExerciseTool } = await import("./tool-query-exercise");

    await runQueryExerciseTool(
      { action: "trend", exercise_name: "Push-ups" },
      TEST_CTX as any
    );

    expect(mockRunExerciseTrendTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups" },
      TEST_CTX
    );
  });

  it("routes manage_exercise rename calls to runRenameExerciseTool", async () => {
    const { runManageExerciseTool } = await import("./tool-manage-exercise");

    await runManageExerciseTool(
      {
        action: "rename",
        exercise_name: "Bench Press",
        new_name: "Flat Bench",
      },
      TEST_CTX as any
    );

    expect(mockResolveExercise).toHaveBeenCalled();
    expect(mockMutation).toHaveBeenCalledWith("exercises.updateExercise", {
      id: "exercise_1",
      name: "Flat Bench",
    });
  });

  it("routes modify_set delete calls to runDeleteSetTool", async () => {
    const { runModifySetTool } = await import("./tool-modify-set");

    await runModifySetTool(
      { action: "delete", set_id: "set_123" },
      TEST_CTX as any
    );

    expect(mockRunDeleteSetTool).toHaveBeenCalledWith(
      { set_id: "set_123", exercise_name: undefined },
      TEST_CTX
    );
  });

  it("routes update_settings sound calls to runSetSoundTool", async () => {
    const { runUpdateSettingsTool } = await import("./tool-update-settings");

    await runUpdateSettingsTool(
      { action: "sound", enabled: false },
      TEST_CTX as any
    );

    expect(mockRunSetSoundTool).toHaveBeenCalledWith({ enabled: false });
  });

  it("routes get_insights focus calls to runFocusSuggestionsTool", async () => {
    const { runGetInsightsTool } = await import("./tool-get-insights");

    await runGetInsightsTool({ action: "focus_suggestions" }, TEST_CTX as any);

    expect(mockRunFocusSuggestionsTool).toHaveBeenCalledWith(TEST_CTX);
  });
});
