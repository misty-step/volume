// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunLogSetTool = vi.fn();
const mockRunBulkLogTool = vi.fn();
const mockRunTodaySummaryTool = vi.fn();
const mockRunExerciseTrendTool = vi.fn();
const mockRunAnalyticsOverviewTool = vi.fn();
const mockRunDeleteSetTool = vi.fn();
const mockRunEditSetTool = vi.fn();
const mockRunSetSoundTool = vi.fn();
const mockRunSetWeightUnitTool = vi.fn();
const mockRunUpdatePreferencesTool = vi.fn();
const mockRunFocusSuggestionsTool = vi.fn();
const mockResolveExercise = vi.fn();
const mockListExercises = vi.fn();
const mockFindExercise = vi.fn();
const mockMutation = vi.fn();

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    exercises: {
      updateExercise: "exercises.updateExercise",
      deleteExercise: "exercises.deleteExercise",
      restoreExercise: "exercises.restoreExercise",
      mergeExercise: "exercises.mergeExercise",
      updateMuscleGroups: "exercises.updateMuscleGroups",
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

vi.mock("./tool-analytics-overview", () => ({
  runAnalyticsOverviewTool: (...args: unknown[]) =>
    mockRunAnalyticsOverviewTool(...args),
}));

vi.mock("./data", async () => {
  const actual = await vi.importActual<typeof import("./data")>("./data");
  return {
    ...actual,
    resolveExercise: (...args: unknown[]) => mockResolveExercise(...args),
    listExercises: (...args: unknown[]) => mockListExercises(...args),
    findExercise: (...args: unknown[]) => mockFindExercise(...args),
  };
});

vi.mock("./tool-delete-set", () => ({
  runDeleteSetTool: (...args: unknown[]) => mockRunDeleteSetTool(...args),
}));

vi.mock("./tool-edit-set", () => ({
  runEditSetTool: (...args: unknown[]) => mockRunEditSetTool(...args),
}));

vi.mock("./tool-set-sound", () => ({
  runSetSoundTool: (...args: unknown[]) => mockRunSetSoundTool(...args),
}));

vi.mock("./tool-set-weight-unit", () => ({
  runSetWeightUnitTool: (...args: unknown[]) =>
    mockRunSetWeightUnitTool(...args),
}));

vi.mock("./tool-update-preferences", () => ({
  runUpdatePreferencesTool: (...args: unknown[]) =>
    mockRunUpdatePreferencesTool(...args),
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
    mockRunAnalyticsOverviewTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunDeleteSetTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunEditSetTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunSetSoundTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunSetWeightUnitTool.mockReset().mockResolvedValue(OK_RESULT);
    mockRunUpdatePreferencesTool.mockReset().mockResolvedValue(OK_RESULT);
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
    mockListExercises.mockReset().mockResolvedValue([
      {
        _id: "exercise_1",
        name: "Bench Press",
        userId: "user_1",
        createdAt: Date.now(),
      },
      {
        _id: "exercise_2",
        name: "Flat Bench",
        userId: "user_1",
        createdAt: Date.now(),
      },
    ]);
    mockFindExercise
      .mockReset()
      .mockResolvedValueOnce({
        _id: "exercise_1",
        name: "Bench Press",
        userId: "user_1",
        createdAt: Date.now(),
      })
      .mockResolvedValueOnce({
        _id: "exercise_2",
        name: "Flat Bench",
        userId: "user_1",
        createdAt: Date.now(),
      });
    mockMutation.mockReset().mockResolvedValue(undefined);
  });

  it("routes canonical log_set calls to runLogSetTool", async () => {
    const { runLogSetsTool } = await import("./tool-log-sets");

    await runLogSetsTool(
      {
        action: "log_set",
        set: { exercise_name: "Push-ups", reps: 12 },
      },
      TEST_CTX as any
    );

    expect(mockRunLogSetTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups", reps: 12 },
      TEST_CTX,
      undefined
    );
    expect(mockRunBulkLogTool).not.toHaveBeenCalled();
  });

  it("routes canonical bulk_log calls to runBulkLogTool even for one item", async () => {
    const { runLogSetsTool } = await import("./tool-log-sets");

    await runLogSetsTool(
      {
        action: "bulk_log",
        sets: [{ exercise_name: "Push-ups", reps: 12 }],
      },
      TEST_CTX as any
    );

    expect(mockRunBulkLogTool).toHaveBeenCalledWith(
      { sets: [{ exercise_name: "Push-ups", reps: 12 }] },
      TEST_CTX
    );
    expect(mockRunLogSetTool).not.toHaveBeenCalled();
  });

  it("keeps legacy single-item sets arrays mapped to runLogSetTool", async () => {
    const { runLogSetsTool } = await import("./tool-log-sets");

    await runLogSetsTool(
      { sets: [{ exercise_name: "Push-ups", reps: 12 }] },
      TEST_CTX as any
    );

    expect(mockRunLogSetTool).toHaveBeenCalledWith(
      { exercise_name: "Push-ups", reps: 12 },
      TEST_CTX,
      undefined
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

  it("routes manage_exercise delete calls to the archive mutation", async () => {
    const { runManageExerciseTool } = await import("./tool-manage-exercise");

    await runManageExerciseTool(
      {
        action: "delete",
        exercise_name: "Bench Press",
      },
      TEST_CTX as any
    );

    expect(mockMutation).toHaveBeenCalledWith("exercises.deleteExercise", {
      id: "exercise_1",
    });
  });

  it("routes manage_exercise restore calls to the restore mutation", async () => {
    const { runManageExerciseTool } = await import("./tool-manage-exercise");

    mockResolveExercise.mockResolvedValueOnce({
      exercise: {
        _id: "exercise_1",
        name: "Bench Press",
        userId: "user_1",
        createdAt: Date.now(),
        deletedAt: Date.now(),
      },
      exercises: [],
      closeMatches: [],
    });

    await runManageExerciseTool(
      {
        action: "restore",
        exercise_name: "Bench Press",
      },
      TEST_CTX as any
    );

    expect(mockMutation).toHaveBeenCalledWith("exercises.restoreExercise", {
      id: "exercise_1",
    });
  });

  it("routes manage_exercise merge calls to the merge mutation", async () => {
    const { runManageExerciseTool } = await import("./tool-manage-exercise");

    mockMutation.mockResolvedValueOnce({
      mergedCount: 3,
      keptExercise: "Flat Bench",
    });

    await runManageExerciseTool(
      {
        action: "merge",
        source_exercise: "Bench Press",
        target_exercise: "Flat Bench",
      },
      TEST_CTX as any
    );

    expect(mockMutation).toHaveBeenCalledWith("exercises.mergeExercise", {
      fromId: "exercise_1",
      toId: "exercise_2",
    });
  });

  it("routes manage_exercise update_muscle_groups calls to the muscle group mutation", async () => {
    const { runManageExerciseTool } = await import("./tool-manage-exercise");

    await runManageExerciseTool(
      {
        action: "update_muscle_groups",
        exercise_name: "Bench Press",
        muscle_groups: ["chest", "triceps", "chest"],
      },
      TEST_CTX as any
    );

    expect(mockMutation).toHaveBeenCalledWith("exercises.updateMuscleGroups", {
      id: "exercise_1",
      muscleGroups: ["Chest", "Triceps"],
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

  it("routes modify_set edit calls to runEditSetTool", async () => {
    const { runModifySetTool } = await import("./tool-modify-set");

    await runModifySetTool(
      {
        action: "edit",
        set_id: "set_123",
        reps: 8,
        weight: 185,
        unit: "lbs",
      },
      TEST_CTX as any
    );

    expect(mockRunEditSetTool).toHaveBeenCalledWith(
      {
        set_id: "set_123",
        reps: 8,
        duration_seconds: undefined,
        weight: 185,
        unit: "lbs",
      },
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

  it("routes update_settings weight_unit calls to runSetWeightUnitTool", async () => {
    const { runUpdateSettingsTool } = await import("./tool-update-settings");

    await runUpdateSettingsTool(
      { action: "weight_unit", unit: "kg" },
      TEST_CTX as any
    );

    expect(mockRunSetWeightUnitTool).toHaveBeenCalledWith({ unit: "kg" });
  });

  it("routes update_settings preferences calls to runUpdatePreferencesTool", async () => {
    const { runUpdateSettingsTool } = await import("./tool-update-settings");

    await runUpdateSettingsTool(
      {
        action: "preferences",
        goals: ["get_stronger"],
        custom_goal: "Bench 225",
      },
      TEST_CTX as any
    );

    expect(mockRunUpdatePreferencesTool).toHaveBeenCalledWith(
      {
        goals: ["get_stronger"],
        custom_goal: "Bench 225",
        training_split: undefined,
        coach_notes: undefined,
      },
      TEST_CTX
    );
  });

  it("routes get_insights focus calls to runFocusSuggestionsTool", async () => {
    const { runGetInsightsTool } = await import("./tool-get-insights");

    await runGetInsightsTool({ action: "focus_suggestions" }, TEST_CTX as any);

    expect(mockRunFocusSuggestionsTool).toHaveBeenCalledWith(TEST_CTX);
  });

  it("routes get_insights analytics calls to runAnalyticsOverviewTool", async () => {
    const { runGetInsightsTool } = await import("./tool-get-insights");

    await runGetInsightsTool({ action: "analytics_overview" }, TEST_CTX as any);

    expect(mockRunAnalyticsOverviewTool).toHaveBeenCalledWith(TEST_CTX);
  });
});
