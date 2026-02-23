import { tool } from "ai";
import { z } from "zod";
import type { CoachBlock } from "@/lib/coach/schema";
import type { CoachToolContext } from "@/lib/coach/tools/types";
import { runLogSetTool } from "@/lib/coach/tools/tool-log-set";
import { runTodaySummaryTool } from "@/lib/coach/tools/tool-today-summary";
import { runExerciseReportTool } from "@/lib/coach/tools/tool-exercise-report";
import { runFocusSuggestionsTool } from "@/lib/coach/tools/tool-focus-suggestions";
import { runSetWeightUnitTool } from "@/lib/coach/tools/tool-set-weight-unit";
import { runSetSoundTool } from "@/lib/coach/tools/tool-set-sound";

// Each tool returns { blocks: CoachBlock[], ...modelData } so the stream
// observer can extract blocks from tool-result chunks.
export type ToolOutput = { blocks: CoachBlock[]; [key: string]: unknown };

function wrap(result: {
  blocks: CoachBlock[];
  outputForModel: Record<string, unknown>;
}): ToolOutput {
  return { blocks: result.blocks, ...result.outputForModel };
}

export function createCoachTools(ctx: CoachToolContext) {
  return {
    log_set: tool({
      description:
        "Log a workout set. Exactly one of reps or duration_seconds is required. Use reps for rep-based movements and duration_seconds (integer seconds) for timed holds. Preserve exact user numbers; do not round.",
      inputSchema: z.object({
        exercise_name: z.string(),
        reps: z.number().int().min(1).max(1000).optional(),
        duration_seconds: z.number().int().min(1).max(86400).optional(),
        weight: z.number().min(0).max(5000).optional(),
        unit: z.enum(["lbs", "kg"]).optional(),
      }),
      execute: async (args) => wrap(await runLogSetTool(args, ctx)),
    }),

    get_today_summary: tool({
      description: "Get today's workout totals and top exercises.",
      inputSchema: z.object({}),
      execute: async () => wrap(await runTodaySummaryTool(ctx)),
    }),

    get_exercise_report: tool({
      description: "Get a focused report and trend for a specific exercise.",
      inputSchema: z.object({
        exercise_name: z.string(),
      }),
      execute: async (args) => wrap(await runExerciseReportTool(args, ctx)),
    }),

    get_focus_suggestions: tool({
      description:
        "Get prioritized suggestions for what the user should work on today based on imbalance and recency.",
      inputSchema: z.object({}),
      execute: async () => wrap(await runFocusSuggestionsTool(ctx)),
    }),

    set_weight_unit: tool({
      description: "Set local default weight unit preference.",
      inputSchema: z.object({
        unit: z.enum(["lbs", "kg"]),
      }),
      execute: async (args) => wrap(await runSetWeightUnitTool(args)),
    }),

    set_sound: tool({
      description: "Enable or disable local tactile sound preference.",
      inputSchema: z.object({
        enabled: z.boolean(),
      }),
      execute: async (args) => wrap(await runSetSoundTool(args)),
    }),
  };
}
