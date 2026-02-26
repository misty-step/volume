import type {
  CoachToolContext,
  CoachToolExecutionOptions,
  ToolResult,
} from "./types";
import { runExerciseReportTool } from "./tool-exercise-report";
import { runFocusSuggestionsTool } from "./tool-focus-suggestions";
import { runLogSetTool } from "./tool-log-set";
import { runSetSoundTool } from "./tool-set-sound";
import { runSetWeightUnitTool } from "./tool-set-weight-unit";
import { runTodaySummaryTool } from "./tool-today-summary";
import { runHistoryOverviewTool } from "./tool-history-overview";
import { runAnalyticsOverviewTool } from "./tool-analytics-overview";
import { runExerciseLibraryTool } from "./tool-exercise-library";
import {
  runDeleteExerciseTool,
  runMergeExerciseTool,
  runRenameExerciseTool,
  runRestoreExerciseTool,
  runUpdateExerciseMuscleGroupsTool,
} from "./tool-manage-exercise";
import { runDeleteSetTool } from "./tool-delete-set";
import { runSettingsOverviewTool } from "./tool-settings-overview";
import { runUpdatePreferencesTool } from "./tool-update-preferences";
import { runReportHistoryTool } from "./tool-report-history";
import { runWorkspaceTool } from "./tool-workspace";

type CoachToolHandler = (
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
) => Promise<ToolResult>;

const TOOL_HANDLERS: Record<string, CoachToolHandler> = {
  log_set: (rawArgs, ctx, options) => runLogSetTool(rawArgs, ctx, options),
  get_today_summary: async (_rawArgs, ctx) => runTodaySummaryTool(ctx),
  get_exercise_report: (rawArgs, ctx) => runExerciseReportTool(rawArgs, ctx),
  get_focus_suggestions: async (_rawArgs, ctx) => runFocusSuggestionsTool(ctx),
  set_weight_unit: async (rawArgs) => runSetWeightUnitTool(rawArgs),
  set_sound: async (rawArgs) => runSetSoundTool(rawArgs),
  show_workspace: async (_rawArgs, ctx) => runWorkspaceTool(ctx),
  get_history_overview: (rawArgs, ctx) => runHistoryOverviewTool(rawArgs, ctx),
  get_analytics_overview: async (_rawArgs, ctx) =>
    runAnalyticsOverviewTool(ctx),
  get_exercise_library: async (_rawArgs, ctx) => runExerciseLibraryTool(ctx),
  rename_exercise: (rawArgs, ctx) => runRenameExerciseTool(rawArgs, ctx),
  merge_exercise: (rawArgs, ctx) => runMergeExerciseTool(rawArgs, ctx),
  delete_exercise: (rawArgs, ctx) => runDeleteExerciseTool(rawArgs, ctx),
  restore_exercise: (rawArgs, ctx) => runRestoreExerciseTool(rawArgs, ctx),
  update_exercise_muscle_groups: (rawArgs, ctx) =>
    runUpdateExerciseMuscleGroupsTool(rawArgs, ctx),
  delete_set: (rawArgs, ctx) => runDeleteSetTool(rawArgs, ctx),
  get_settings_overview: async (_rawArgs, ctx) => runSettingsOverviewTool(ctx),
  update_preferences: (rawArgs, ctx) => runUpdatePreferencesTool(rawArgs, ctx),
  get_report_history: (rawArgs, ctx) => runReportHistoryTool(rawArgs, ctx),
};

export async function executeCoachTool(
  toolName: string,
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
): Promise<ToolResult> {
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    return {
      summary: `Unsupported tool: ${toolName}`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Unsupported action",
          description: `${toolName} is not available.`,
        },
        {
          type: "suggestions",
          prompts: ["show today's summary", "what should I work on today?"],
        },
      ],
      outputForModel: {
        status: "error",
        error: "unsupported_tool",
        tool: toolName,
      },
    };
  }

  return handler(rawArgs, ctx, options);
}
