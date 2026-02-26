import { tool } from "ai";
import { z } from "zod";
import type { CoachBlock } from "@/lib/coach/schema";
import type { CoachToolContext, ToolResult } from "@/lib/coach/tools/types";
import {
  DeleteSetArgsSchema,
  ExerciseReportArgsSchema,
  ExerciseNameArgsSchema,
  MergeExerciseArgsSchema,
  RenameExerciseArgsSchema,
  ReportHistoryArgsSchema,
  HistoryArgsSchema,
  LogSetArgsSchema,
  UpdateMuscleGroupsArgsSchema,
  UpdatePreferencesArgsSchema,
  SetSoundArgsSchema,
  SetWeightUnitArgsSchema,
} from "@/lib/coach/tools/schemas";
import { runLogSetTool } from "@/lib/coach/tools/tool-log-set";
import { runTodaySummaryTool } from "@/lib/coach/tools/tool-today-summary";
import { runExerciseReportTool } from "@/lib/coach/tools/tool-exercise-report";
import { runFocusSuggestionsTool } from "@/lib/coach/tools/tool-focus-suggestions";
import { runSetWeightUnitTool } from "@/lib/coach/tools/tool-set-weight-unit";
import { runSetSoundTool } from "@/lib/coach/tools/tool-set-sound";
import { runHistoryOverviewTool } from "@/lib/coach/tools/tool-history-overview";
import { runAnalyticsOverviewTool } from "@/lib/coach/tools/tool-analytics-overview";
import { runExerciseLibraryTool } from "@/lib/coach/tools/tool-exercise-library";
import {
  runDeleteExerciseTool,
  runMergeExerciseTool,
  runRenameExerciseTool,
  runRestoreExerciseTool,
  runUpdateExerciseMuscleGroupsTool,
} from "@/lib/coach/tools/tool-manage-exercise";
import { runDeleteSetTool } from "@/lib/coach/tools/tool-delete-set";
import { runSettingsOverviewTool } from "@/lib/coach/tools/tool-settings-overview";
import { runUpdatePreferencesTool } from "@/lib/coach/tools/tool-update-preferences";
import { runReportHistoryTool } from "@/lib/coach/tools/tool-report-history";
import { runWorkspaceTool } from "@/lib/coach/tools/tool-workspace";

export type ToolOutput = Record<string, unknown>;
type ToolBlocksHandler = (toolName: string, blocks: CoachBlock[]) => void;
type CreateCoachToolsOptions = { onBlocks?: ToolBlocksHandler };

function wrap(
  toolName: string,
  result: ToolResult,
  onBlocks?: ToolBlocksHandler
): ToolOutput {
  onBlocks?.(toolName, result.blocks);
  return result.outputForModel;
}

function toolError(
  toolName: string,
  message: string,
  onBlocks?: ToolBlocksHandler
): ToolOutput {
  onBlocks?.(toolName, [
    {
      type: "status",
      tone: "error",
      title: "Tool failed",
      description: message,
    } satisfies CoachBlock,
  ]);
  return { error: message };
}

export function createCoachTools(
  ctx: CoachToolContext,
  options: CreateCoachToolsOptions = {}
) {
  const { onBlocks } = options;

  async function runTool(
    toolName: string,
    runner: () => ToolResult | Promise<ToolResult>
  ): Promise<ToolOutput> {
    try {
      return wrap(toolName, await runner(), onBlocks);
    } catch (e) {
      return toolError(
        toolName,
        e instanceof Error ? e.message : "Unexpected error",
        onBlocks
      );
    }
  }

  return {
    log_set: tool({
      description:
        "Log a workout set. Exactly one of reps or duration_seconds is required. Use reps for rep-based movements and duration_seconds (integer seconds) for timed holds. Preserve exact user numbers; do not round.",
      inputSchema: LogSetArgsSchema,
      execute: (args) => runTool("log_set", () => runLogSetTool(args, ctx)),
    }),

    get_today_summary: tool({
      description: "Get today's workout totals and top exercises.",
      inputSchema: z.object({}),
      execute: () =>
        runTool("get_today_summary", () => runTodaySummaryTool(ctx)),
    }),

    get_exercise_report: tool({
      description: "Get a focused report and trend for a specific exercise.",
      inputSchema: ExerciseReportArgsSchema,
      execute: (args) =>
        runTool("get_exercise_report", () => runExerciseReportTool(args, ctx)),
    }),

    get_focus_suggestions: tool({
      description:
        "Get prioritized suggestions for what the user should work on today based on imbalance and recency.",
      inputSchema: z.object({}),
      execute: () =>
        runTool("get_focus_suggestions", () => runFocusSuggestionsTool(ctx)),
    }),

    set_weight_unit: tool({
      description: "Set local default weight unit preference.",
      inputSchema: SetWeightUnitArgsSchema,
      execute: (args) =>
        runTool("set_weight_unit", () => runSetWeightUnitTool(args)),
    }),

    set_sound: tool({
      description: "Enable or disable local tactile sound preference.",
      inputSchema: SetSoundArgsSchema,
      execute: (args) => runTool("set_sound", () => runSetSoundTool(args)),
    }),

    show_workspace: tool({
      description:
        "Show the workspace capabilities and starter interactive components.",
      inputSchema: z.object({}),
      execute: () => runTool("show_workspace", () => runWorkspaceTool(ctx)),
    }),

    get_history_overview: tool({
      description:
        "Get recent workout history including set ids for follow-up delete actions.",
      inputSchema: HistoryArgsSchema,
      execute: (args) =>
        runTool("get_history_overview", () =>
          runHistoryOverviewTool(args, ctx)
        ),
    }),

    get_analytics_overview: tool({
      description:
        "Get a combined analytics overview including streaks, PRs, and overload.",
      inputSchema: z.object({}),
      execute: () =>
        runTool("get_analytics_overview", () => runAnalyticsOverviewTool(ctx)),
    }),

    get_exercise_library: tool({
      description:
        "List exercise library including archived entries and available actions.",
      inputSchema: z.object({}),
      execute: () =>
        runTool("get_exercise_library", () => runExerciseLibraryTool(ctx)),
    }),

    rename_exercise: tool({
      description: "Rename an existing active exercise.",
      inputSchema: RenameExerciseArgsSchema,
      execute: (args) =>
        runTool("rename_exercise", () => runRenameExerciseTool(args, ctx)),
    }),

    delete_exercise: tool({
      description: "Archive an active exercise without losing set history.",
      inputSchema: ExerciseNameArgsSchema,
      execute: (args) =>
        runTool("delete_exercise", () => runDeleteExerciseTool(args, ctx)),
    }),

    restore_exercise: tool({
      description: "Restore an archived exercise.",
      inputSchema: ExerciseNameArgsSchema,
      execute: (args) =>
        runTool("restore_exercise", () => runRestoreExerciseTool(args, ctx)),
    }),

    update_exercise_muscle_groups: tool({
      description:
        "Update muscle groups for an active exercise using canonical group names.",
      inputSchema: UpdateMuscleGroupsArgsSchema,
      execute: (args) =>
        runTool("update_exercise_muscle_groups", () =>
          runUpdateExerciseMuscleGroupsTool(args, ctx)
        ),
    }),

    merge_exercise: tool({
      description:
        "Merge a source exercise into a target exercise, reassigning all historical sets and archiving the source.",
      inputSchema: MergeExerciseArgsSchema,
      execute: (args) =>
        runTool("merge_exercise", () => runMergeExerciseTool(args, ctx)),
    }),

    delete_set: tool({
      description:
        "Delete a set by set_id or by taking latest set for exercise.",
      inputSchema: DeleteSetArgsSchema,
      execute: (args) =>
        runTool("delete_set", () => runDeleteSetTool(args, ctx)),
    }),

    get_settings_overview: tool({
      description:
        "Get profile preferences, subscription status, and billing actions.",
      inputSchema: z.object({}),
      execute: () =>
        runTool("get_settings_overview", () => runSettingsOverviewTool(ctx)),
    }),

    update_preferences: tool({
      description:
        "Update goals, custom goal, training split, and coach notes preferences.",
      inputSchema: UpdatePreferencesArgsSchema,
      execute: (args) =>
        runTool("update_preferences", () =>
          runUpdatePreferencesTool(args, ctx)
        ),
    }),

    get_report_history: tool({
      description: "List recent AI report history entries.",
      inputSchema: ReportHistoryArgsSchema,
      execute: (args) =>
        runTool("get_report_history", () => runReportHistoryTool(args, ctx)),
    }),
  };
}
