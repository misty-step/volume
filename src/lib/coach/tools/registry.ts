import { z, type ZodTypeAny } from "zod";
import type {
  CoachToolContext,
  CoachToolExecutionOptions,
  ToolResult,
} from "./types";
import {
  BulkLogArgsSchema,
  DateRangeSetsArgsSchema,
  DeleteSetArgsSchema,
  EditSetArgsSchema,
  ExerciseHistoryArgsSchema,
  ExerciseNameArgsSchema,
  ExerciseReportArgsSchema,
  HistoryArgsSchema,
  LogSetArgsSchema,
  MergeExerciseArgsSchema,
  RenameExerciseArgsSchema,
  ReportHistoryArgsSchema,
  SetSoundArgsSchema,
  SetWeightUnitArgsSchema,
  UpdateMuscleGroupsArgsSchema,
  UpdatePreferencesArgsSchema,
  WorkoutSessionArgsSchema,
} from "./schemas";
import { runAnalyticsOverviewTool } from "./tool-analytics-overview";
import { runBulkLogTool } from "./tool-bulk-log";
import { runDateRangeSetsTool } from "./tool-date-range-sets";
import { runDeleteSetTool } from "./tool-delete-set";
import { runEditSetTool } from "./tool-edit-set";
import { runExerciseHistoryTool } from "./tool-exercise-history";
import { runExerciseLibraryTool } from "./tool-exercise-library";
import {
  runExerciseSnapshotTool,
  runExerciseTrendTool,
} from "./tool-exercise-report";
import { runFocusSuggestionsTool } from "./tool-focus-suggestions";
import { runHistoryOverviewTool } from "./tool-history-overview";
import { runLogSetTool } from "./tool-log-set";
import {
  runDeleteExerciseTool,
  runMergeExerciseTool,
  runRenameExerciseTool,
  runRestoreExerciseTool,
  runUpdateExerciseMuscleGroupsTool,
} from "./tool-manage-exercise";
import { runReportHistoryTool } from "./tool-report-history";
import { runSetSoundTool } from "./tool-set-sound";
import { runSetWeightUnitTool } from "./tool-set-weight-unit";
import { runSettingsOverviewTool } from "./tool-settings-overview";
import { runTodaySummaryTool } from "./tool-today-summary";
import { runUpdatePreferencesTool } from "./tool-update-preferences";
import { runWorkoutSessionTool } from "./tool-workout-session";
import { runWorkspaceTool } from "./tool-workspace";

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

export const coachToolDefinitions = [
  {
    name: "log_set",
    description:
      "Log a workout set. Exactly one of reps or duration_seconds is required. Use reps for rep-based movements and duration_seconds (integer seconds) for timed holds. Preserve exact user numbers; do not round.",
    inputSchema: LogSetArgsSchema,
    run: (rawArgs, ctx, options) => runLogSetTool(rawArgs, ctx, options),
  },
  {
    name: "get_today_summary",
    description: "Get today's workout totals and top exercises.",
    inputSchema: EmptyArgsSchema,
    run: async (_rawArgs, ctx) => runTodaySummaryTool(ctx),
  },
  {
    name: "get_exercise_snapshot",
    description:
      "Get summary metrics for a specific exercise (total sets, best, latest).",
    inputSchema: ExerciseReportArgsSchema,
    run: (rawArgs, ctx) => runExerciseSnapshotTool(rawArgs, ctx),
  },
  {
    name: "get_exercise_trend",
    description: "Get the 14-day trend chart for a specific exercise.",
    inputSchema: ExerciseReportArgsSchema,
    run: (rawArgs, ctx) => runExerciseTrendTool(rawArgs, ctx),
  },
  {
    name: "get_focus_suggestions",
    description:
      "Get prioritized suggestions for what the user should work on today based on imbalance and recency.",
    inputSchema: EmptyArgsSchema,
    run: async (_rawArgs, ctx) => runFocusSuggestionsTool(ctx),
  },
  {
    name: "set_weight_unit",
    description: "Set local default weight unit preference.",
    inputSchema: SetWeightUnitArgsSchema,
    run: async (rawArgs) => runSetWeightUnitTool(rawArgs),
  },
  {
    name: "set_sound",
    description: "Enable or disable local tactile sound preference.",
    inputSchema: SetSoundArgsSchema,
    run: async (rawArgs) => runSetSoundTool(rawArgs),
  },
  {
    name: "show_workspace",
    description:
      "Show the workspace capabilities and starter interactive components.",
    inputSchema: EmptyArgsSchema,
    run: async (_rawArgs, ctx) => runWorkspaceTool(ctx),
  },
  {
    name: "get_history_overview",
    description:
      "Get recent workout history including set ids for follow-up delete actions.",
    inputSchema: HistoryArgsSchema,
    run: (rawArgs, ctx) => runHistoryOverviewTool(rawArgs, ctx),
  },
  {
    name: "get_analytics_overview",
    description:
      "Get a combined analytics overview including streaks, PRs, and overload.",
    inputSchema: EmptyArgsSchema,
    run: async (_rawArgs, ctx) => runAnalyticsOverviewTool(ctx),
  },
  {
    name: "get_exercise_library",
    description:
      "List exercise library including archived entries and available actions.",
    inputSchema: EmptyArgsSchema,
    run: async (_rawArgs, ctx) => runExerciseLibraryTool(ctx),
  },
  {
    name: "rename_exercise",
    description: "Rename an existing active exercise.",
    inputSchema: RenameExerciseArgsSchema,
    run: (rawArgs, ctx) => runRenameExerciseTool(rawArgs, ctx),
  },
  {
    name: "delete_exercise",
    description: "Archive an active exercise without losing set history.",
    inputSchema: ExerciseNameArgsSchema,
    run: (rawArgs, ctx) => runDeleteExerciseTool(rawArgs, ctx),
  },
  {
    name: "restore_exercise",
    description: "Restore an archived exercise.",
    inputSchema: ExerciseNameArgsSchema,
    run: (rawArgs, ctx) => runRestoreExerciseTool(rawArgs, ctx),
  },
  {
    name: "update_exercise_muscle_groups",
    description:
      "Update muscle groups for an active exercise using canonical group names.",
    inputSchema: UpdateMuscleGroupsArgsSchema,
    run: (rawArgs, ctx) => runUpdateExerciseMuscleGroupsTool(rawArgs, ctx),
  },
  {
    name: "merge_exercise",
    description:
      "Merge a source exercise into a target exercise, reassigning all historical sets and archiving the source.",
    inputSchema: MergeExerciseArgsSchema,
    run: (rawArgs, ctx) => runMergeExerciseTool(rawArgs, ctx),
  },
  {
    name: "delete_set",
    description: "Delete a set by set_id or by taking latest set for exercise.",
    inputSchema: DeleteSetArgsSchema,
    run: (rawArgs, ctx) => runDeleteSetTool(rawArgs, ctx),
  },
  {
    name: "get_settings_overview",
    description:
      "Get profile preferences, subscription status, and billing actions.",
    inputSchema: EmptyArgsSchema,
    run: async (_rawArgs, ctx) => runSettingsOverviewTool(ctx),
  },
  {
    name: "update_preferences",
    description:
      "Update goals, custom goal, training split, and coach notes preferences.",
    inputSchema: UpdatePreferencesArgsSchema,
    run: (rawArgs, ctx) => runUpdatePreferencesTool(rawArgs, ctx),
  },
  {
    name: "get_report_history",
    description: "List recent AI report history entries.",
    inputSchema: ReportHistoryArgsSchema,
    run: (rawArgs, ctx) => runReportHistoryTool(rawArgs, ctx),
  },
  {
    name: "edit_set",
    description:
      "Edit an existing set by set_id. Update reps, weight, or duration.",
    inputSchema: EditSetArgsSchema,
    run: (rawArgs, ctx) => runEditSetTool(rawArgs, ctx),
  },
  {
    name: "bulk_log",
    description:
      "Log multiple sets in one turn. Use when user says they did multiple exercises or multiple sets.",
    inputSchema: BulkLogArgsSchema,
    run: (rawArgs, ctx) => runBulkLogTool(rawArgs, ctx),
  },
  {
    name: "get_exercise_history",
    description:
      "Get recent set history for a specific exercise with dates and stats.",
    inputSchema: ExerciseHistoryArgsSchema,
    run: (rawArgs, ctx) => runExerciseHistoryTool(rawArgs, ctx),
  },
  {
    name: "get_date_range_sets",
    description: "Get sets within a date range (YYYY-MM-DD), grouped by day.",
    inputSchema: DateRangeSetsArgsSchema,
    run: (rawArgs, ctx) => runDateRangeSetsTool(rawArgs, ctx),
  },
  {
    name: "get_workout_session",
    description:
      "Get all sets for a specific date (defaults to today) with volume totals.",
    inputSchema: WorkoutSessionArgsSchema,
    run: (rawArgs, ctx) => runWorkoutSessionTool(rawArgs, ctx),
  },
] satisfies readonly CoachToolDefinition[];

const coachToolDefinitionMap = new Map(
  coachToolDefinitions.map((definition) => [definition.name, definition])
);

export function getCoachToolDefinition(toolName: string) {
  return coachToolDefinitionMap.get(toolName);
}

export function getCoachToolNames() {
  return coachToolDefinitions.map((definition) => definition.name);
}
