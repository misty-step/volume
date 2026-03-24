import { z, type ZodTypeAny } from "zod";
import { runAnalyticsOverviewTool } from "@/lib/coach/tools/tool-analytics-overview";
import { runBulkLogTool } from "@/lib/coach/tools/tool-bulk-log";
import { runDateRangeSetsTool } from "@/lib/coach/tools/tool-date-range-sets";
import { runDeleteSetTool } from "@/lib/coach/tools/tool-delete-set";
import { runEditSetTool } from "@/lib/coach/tools/tool-edit-set";
import { runExerciseHistoryTool } from "@/lib/coach/tools/tool-exercise-history";
import { runExerciseLibraryTool } from "@/lib/coach/tools/tool-exercise-library";
import {
  runExerciseSnapshotTool,
  runExerciseTrendTool,
} from "@/lib/coach/tools/tool-exercise-report";
import { runFocusSuggestionsTool } from "@/lib/coach/tools/tool-focus-suggestions";
import { runGetInsightsTool } from "@/lib/coach/tools/tool-get-insights";
import { runHistoryOverviewTool } from "@/lib/coach/tools/tool-history-overview";
import { runLogSetsTool } from "@/lib/coach/tools/tool-log-sets";
import { runLogSetTool } from "@/lib/coach/tools/tool-log-set";
import {
  runDeleteExerciseTool,
  runManageExerciseTool,
  runMergeExerciseTool,
  runRenameExerciseTool,
  runRestoreExerciseTool,
  runUpdateExerciseMuscleGroupsTool,
} from "@/lib/coach/tools/tool-manage-exercise";
import { runModifySetTool } from "@/lib/coach/tools/tool-modify-set";
import { runQueryExerciseTool } from "@/lib/coach/tools/tool-query-exercise";
import { runQueryWorkoutsTool } from "@/lib/coach/tools/tool-query-workouts";
import { runReportHistoryTool } from "@/lib/coach/tools/tool-report-history";
import { runSetSoundTool } from "@/lib/coach/tools/tool-set-sound";
import { runSetWeightUnitTool } from "@/lib/coach/tools/tool-set-weight-unit";
import { runSettingsOverviewTool } from "@/lib/coach/tools/tool-settings-overview";
import { runTodaySummaryTool } from "@/lib/coach/tools/tool-today-summary";
import { runUpdatePreferencesTool } from "@/lib/coach/tools/tool-update-preferences";
import { runUpdateSettingsTool } from "@/lib/coach/tools/tool-update-settings";
import { runWorkoutSessionTool } from "@/lib/coach/tools/tool-workout-session";
import { runWorkspaceTool } from "@/lib/coach/tools/tool-workspace";
import type {
  CoachToolContext,
  CoachToolExecutionOptions,
  ToolResult,
} from "@/lib/coach/tools/types";
import {
  BulkLogArgsSchema,
  DateRangeSetsArgsSchema,
  DeleteSetArgsSchema,
  EditSetArgsSchema,
  ExerciseHistoryArgsSchema,
  ExerciseNameArgsSchema,
  ExerciseReportArgsSchema,
  GetInsightsArgsSchema,
  HistoryArgsSchema,
  LogSetArgsSchema,
  LogSetsArgsSchema,
  ManageExerciseArgsSchema,
  MergeExerciseArgsSchema,
  ModifySetArgsSchema,
  QueryExerciseArgsSchema,
  QueryWorkoutsArgsSchema,
  RenameExerciseArgsSchema,
  ReportHistoryArgsSchema,
  SetSoundArgsSchema,
  SetWeightUnitArgsSchema,
  UpdateMuscleGroupsArgsSchema,
  UpdatePreferencesArgsSchema,
  UpdateSettingsArgsSchema,
  WorkoutSessionArgsSchema,
} from "@/lib/coach/tools/schemas";

type CoachToolRunner = (
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
) => Promise<ToolResult>;

export type CoachToolDefinition = {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  run: CoachToolRunner;
};

const EmptyArgsSchema = z.object({});

function defineTool(
  name: string,
  description: string,
  inputSchema: ZodTypeAny,
  run: CoachToolRunner
): CoachToolDefinition {
  return { name, description, inputSchema, run };
}

export const coachToolDefinitions = [
  defineTool(
    "log_sets",
    "Log one or more workout sets. Use action=log_set with a single set object for one set, or action=bulk_log with a sets array when the user reports multiple sets or exercises.",
    LogSetsArgsSchema,
    (rawArgs, ctx, options) => runLogSetsTool(rawArgs, ctx, options)
  ),
  defineTool(
    "query_workouts",
    "Read workout-level data. Use action=today_summary for today's totals, workout_session for one day, date_range for a span, or history_overview for recent sets.",
    QueryWorkoutsArgsSchema,
    (rawArgs, ctx) => runQueryWorkoutsTool(rawArgs, ctx)
  ),
  defineTool(
    "query_exercise",
    "Read one exercise's data. Use action=snapshot for summary stats, trend for 14-day progression, or history for recent logged sets.",
    QueryExerciseArgsSchema,
    (rawArgs, ctx) => runQueryExerciseTool(rawArgs, ctx)
  ),
  defineTool(
    "manage_exercise",
    "Manage exercise library entries. Use action=rename, delete, restore, merge, or update_muscle_groups.",
    ManageExerciseArgsSchema,
    (rawArgs, ctx) => runManageExerciseTool(rawArgs, ctx)
  ),
  defineTool(
    "modify_set",
    "Modify an existing set. Use action=edit to change a set or action=delete to remove a set by set_id or latest exercise set.",
    ModifySetArgsSchema,
    (rawArgs, ctx) => runModifySetTool(rawArgs, ctx)
  ),
  defineTool(
    "update_settings",
    "Update coach settings. Use action=weight_unit, sound, or preferences.",
    UpdateSettingsArgsSchema,
    (rawArgs, ctx) => runUpdateSettingsTool(rawArgs, ctx)
  ),
  defineTool(
    "get_insights",
    "Read coach insights. Use action=analytics_overview for streaks and PRs, or focus_suggestions for today's training priorities.",
    GetInsightsArgsSchema,
    (rawArgs, ctx) => runGetInsightsTool(rawArgs, ctx)
  ),
  defineTool(
    "get_settings_overview",
    "Get profile preferences, subscription status, and billing actions.",
    EmptyArgsSchema,
    async (_rawArgs, ctx) => runSettingsOverviewTool(ctx)
  ),
  defineTool(
    "get_exercise_library",
    "List exercise library including archived entries and available actions.",
    EmptyArgsSchema,
    async (_rawArgs, ctx) => runExerciseLibraryTool(ctx)
  ),
  defineTool(
    "get_report_history",
    "List recent AI report history entries.",
    ReportHistoryArgsSchema,
    (rawArgs, ctx) => runReportHistoryTool(rawArgs, ctx)
  ),
  defineTool(
    "show_workspace",
    "Show the workspace capabilities and starter interactive components.",
    EmptyArgsSchema,
    async (_rawArgs, ctx) => runWorkspaceTool(ctx)
  ),
] satisfies readonly CoachToolDefinition[];

const legacyCoachToolDefinitions = [
  defineTool(
    "log_set",
    "Log a workout set. Exactly one of reps or duration_seconds is required. Use reps for rep-based movements and duration_seconds (integer seconds) for timed holds. Preserve exact user numbers; do not round.",
    LogSetArgsSchema,
    (rawArgs, ctx, options) => runLogSetTool(rawArgs, ctx, options)
  ),
  defineTool(
    "bulk_log",
    "Log multiple sets in one turn. Use when user says they did multiple exercises or multiple sets.",
    BulkLogArgsSchema,
    (rawArgs, ctx) => runBulkLogTool(rawArgs, ctx)
  ),
  defineTool(
    "get_today_summary",
    "Get today's workout totals and top exercises.",
    EmptyArgsSchema,
    async (_rawArgs, ctx) => runTodaySummaryTool(ctx)
  ),
  defineTool(
    "get_workout_session",
    "Get all sets for a specific date (defaults to today) with volume totals.",
    WorkoutSessionArgsSchema,
    (rawArgs, ctx) => runWorkoutSessionTool(rawArgs, ctx)
  ),
  defineTool(
    "get_date_range_sets",
    "Get sets within a date range (YYYY-MM-DD), grouped by day.",
    DateRangeSetsArgsSchema,
    (rawArgs, ctx) => runDateRangeSetsTool(rawArgs, ctx)
  ),
  defineTool(
    "get_history_overview",
    "Get recent workout history including set ids for follow-up delete actions.",
    HistoryArgsSchema,
    (rawArgs, ctx) => runHistoryOverviewTool(rawArgs, ctx)
  ),
  defineTool(
    "get_exercise_snapshot",
    "Get summary metrics for a specific exercise (total sets, best, latest).",
    ExerciseReportArgsSchema,
    (rawArgs, ctx) => runExerciseSnapshotTool(rawArgs, ctx)
  ),
  defineTool(
    "get_exercise_trend",
    "Get the 14-day trend chart for a specific exercise.",
    ExerciseReportArgsSchema,
    (rawArgs, ctx) => runExerciseTrendTool(rawArgs, ctx)
  ),
  defineTool(
    "get_exercise_history",
    "Get recent set history for a specific exercise with dates and stats.",
    ExerciseHistoryArgsSchema,
    (rawArgs, ctx) => runExerciseHistoryTool(rawArgs, ctx)
  ),
  defineTool(
    "rename_exercise",
    "Rename an existing active exercise.",
    RenameExerciseArgsSchema,
    (rawArgs, ctx) => runRenameExerciseTool(rawArgs, ctx)
  ),
  defineTool(
    "delete_exercise",
    "Archive an active exercise without losing set history.",
    ExerciseNameArgsSchema,
    (rawArgs, ctx) => runDeleteExerciseTool(rawArgs, ctx)
  ),
  defineTool(
    "restore_exercise",
    "Restore an archived exercise.",
    ExerciseNameArgsSchema,
    (rawArgs, ctx) => runRestoreExerciseTool(rawArgs, ctx)
  ),
  defineTool(
    "update_exercise_muscle_groups",
    "Update muscle groups for an active exercise using canonical group names.",
    UpdateMuscleGroupsArgsSchema,
    (rawArgs, ctx) => runUpdateExerciseMuscleGroupsTool(rawArgs, ctx)
  ),
  defineTool(
    "merge_exercise",
    "Merge a source exercise into a target exercise, reassigning all historical sets and archiving the source.",
    MergeExerciseArgsSchema,
    (rawArgs, ctx) => runMergeExerciseTool(rawArgs, ctx)
  ),
  defineTool(
    "delete_set",
    "Delete a set by set_id or by taking latest set for exercise.",
    DeleteSetArgsSchema,
    (rawArgs, ctx) => runDeleteSetTool(rawArgs, ctx)
  ),
  defineTool(
    "edit_set",
    "Edit an existing set by set_id. Update reps, weight, or duration.",
    EditSetArgsSchema,
    (rawArgs, ctx) => runEditSetTool(rawArgs, ctx)
  ),
  defineTool(
    "set_weight_unit",
    "Set local default weight unit preference.",
    SetWeightUnitArgsSchema,
    async (rawArgs) => runSetWeightUnitTool(rawArgs)
  ),
  defineTool(
    "set_sound",
    "Enable or disable local tactile sound preference.",
    SetSoundArgsSchema,
    async (rawArgs) => runSetSoundTool(rawArgs)
  ),
  defineTool(
    "update_preferences",
    "Update goals, custom goal, training split, and coach notes preferences.",
    UpdatePreferencesArgsSchema,
    (rawArgs, ctx) => runUpdatePreferencesTool(rawArgs, ctx)
  ),
  defineTool(
    "get_analytics_overview",
    "Get a combined analytics overview including streaks, PRs, and overload.",
    EmptyArgsSchema,
    async (_rawArgs, ctx) => runAnalyticsOverviewTool(ctx)
  ),
  defineTool(
    "get_focus_suggestions",
    "Get prioritized suggestions for what the user should work on today based on imbalance and recency.",
    EmptyArgsSchema,
    async (_rawArgs, ctx) => runFocusSuggestionsTool(ctx)
  ),
] satisfies readonly CoachToolDefinition[];

const coachToolDefinitionMap = new Map(
  coachToolDefinitions.map((definition) => [definition.name, definition])
);

const legacyCoachToolDefinitionMap = new Map(
  legacyCoachToolDefinitions.map((definition) => [definition.name, definition])
);

export function getCoachToolDefinition(toolName: string) {
  return (
    coachToolDefinitionMap.get(toolName) ??
    legacyCoachToolDefinitionMap.get(toolName)
  );
}

export function getCoachToolNames() {
  return coachToolDefinitions.map((definition) => definition.name);
}
