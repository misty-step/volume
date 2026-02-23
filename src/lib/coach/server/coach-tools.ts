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

// Each tool returns { blocks: CoachBlock[], ...modelData } so the stream
// observer can extract blocks from tool-result chunks.
export type ToolOutput = { blocks: CoachBlock[]; [key: string]: unknown };

function wrap(result: ToolResult): ToolOutput {
  return { blocks: result.blocks, ...result.outputForModel };
}

function toolError(message: string): ToolOutput {
  return {
    blocks: [
      {
        type: "status",
        tone: "error",
        title: "Tool failed",
        description: message,
      } satisfies CoachBlock,
    ],
  };
}

export function createCoachTools(ctx: CoachToolContext) {
  return {
    log_set: tool({
      description:
        "Log a workout set. Exactly one of reps or duration_seconds is required. Use reps for rep-based movements and duration_seconds (integer seconds) for timed holds. Preserve exact user numbers; do not round.",
      inputSchema: LogSetArgsSchema,
      execute: async (args) => {
        try {
          return wrap(await runLogSetTool(args, ctx));
        } catch (e) {
          return toolError(e instanceof Error ? e.message : "Unexpected error");
        }
      },
    }),

    get_today_summary: tool({
      description: "Get today's workout totals and top exercises.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          return wrap(await runTodaySummaryTool(ctx));
        } catch (e) {
          return toolError(e instanceof Error ? e.message : "Unexpected error");
        }
      },
    }),

    get_exercise_report: tool({
      description: "Get a focused report and trend for a specific exercise.",
      inputSchema: ExerciseReportArgsSchema,
      execute: async (args) => {
        try {
          return wrap(await runExerciseReportTool(args, ctx));
        } catch (e) {
          return toolError(e instanceof Error ? e.message : "Unexpected error");
        }
      },
    }),

    get_focus_suggestions: tool({
      description:
        "Get prioritized suggestions for what the user should work on today based on imbalance and recency.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          return wrap(await runFocusSuggestionsTool(ctx));
        } catch (e) {
          return toolError(e instanceof Error ? e.message : "Unexpected error");
        }
      },
    }),

    set_weight_unit: tool({
      description: "Set local default weight unit preference.",
      inputSchema: SetWeightUnitArgsSchema,
      execute: async (args) => {
        try {
          return wrap(await runSetWeightUnitTool(args));
        } catch (e) {
          return toolError(e instanceof Error ? e.message : "Unexpected error");
        }
      },
    }),

    set_sound: tool({
      description: "Enable or disable local tactile sound preference.",
      inputSchema: SetSoundArgsSchema,
      execute: async (args) => {
        try {
          return wrap(await runSetSoundTool(args));
        } catch (e) {
          return toolError(e instanceof Error ? e.message : "Unexpected error");
        }
      },
    }),
  };
}
