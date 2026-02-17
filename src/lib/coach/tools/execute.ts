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
