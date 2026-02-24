import { tool } from "ai";
import { z } from "zod";
import type { CoachBlock } from "@/lib/coach/schema";
import type { CoachToolContext, ToolResult } from "@/lib/coach/tools/types";
import {
  ExerciseReportArgsSchema,
  LogSetArgsSchema,
  SetSoundArgsSchema,
  SetWeightUnitArgsSchema,
} from "@/lib/coach/tools/schemas";
import { runLogSetTool } from "@/lib/coach/tools/tool-log-set";
import { runTodaySummaryTool } from "@/lib/coach/tools/tool-today-summary";
import { runExerciseReportTool } from "@/lib/coach/tools/tool-exercise-report";
import { runFocusSuggestionsTool } from "@/lib/coach/tools/tool-focus-suggestions";
import { runSetWeightUnitTool } from "@/lib/coach/tools/tool-set-weight-unit";
import { runSetSoundTool } from "@/lib/coach/tools/tool-set-sound";

export type ToolOutput = Record<string, unknown>;
type ToolBlocksHandler = (toolName: string, blocks: CoachBlock[]) => void;
type CreateCoachToolsOptions = { onBlocks?: ToolBlocksHandler };
export const BLOCKS_HANDLED_FLAG = "__coachBlocksHandled";

function wrap(
  toolName: string,
  result: ToolResult,
  onBlocks?: ToolBlocksHandler
): ToolOutput {
  onBlocks?.(toolName, result.blocks);
  return { [BLOCKS_HANDLED_FLAG]: true, ...result.outputForModel };
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
  return { [BLOCKS_HANDLED_FLAG]: true, error: message };
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
  };
}
