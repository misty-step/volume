import {
  CoachTurnResponseSchema,
  DEFAULT_COACH_SUGGESTIONS,
  type CoachBlock,
  type CoachStreamEvent,
  type CoachTurnResponse,
} from "@/lib/coach/schema";
import {
  executeCoachTool,
  type CoachToolContext,
} from "@/lib/coach/agent-tools";
import { parseCoachIntent } from "@/lib/coach/prototype-intent";
import { toolErrorBlocks } from "./blocks";

async function executeToolWithStreaming(
  toolName: string,
  args: unknown,
  ctx: CoachToolContext,
  emitEvent?: (event: CoachStreamEvent) => void
) {
  emitEvent?.({ type: "tool_start", toolName });
  let streamed = false;
  const onBlocks = emitEvent
    ? (nextBlocks: CoachBlock[]) => {
        streamed = true;
        emitEvent({ type: "tool_result", toolName, blocks: nextBlocks });
      }
    : undefined;

  const result = await executeCoachTool(toolName, args, ctx, { onBlocks });
  if (emitEvent && !streamed) {
    emitEvent({ type: "tool_result", toolName, blocks: result.blocks });
  }

  return result;
}

export async function runDeterministicFallback(
  userInput: string,
  ctx: CoachToolContext,
  emitEvent?: (event: CoachStreamEvent) => void
): Promise<CoachTurnResponse> {
  const intent = parseCoachIntent(userInput);
  const toolsUsed: string[] = [];
  let blocks: CoachBlock[] = [];
  let assistantText =
    "I can help with logging, summaries, reports, and focus suggestions.";

  try {
    const callFromIntent: null | { toolName: string; args: unknown } = (() => {
      switch (intent.type) {
        case "log_set":
          return {
            toolName: "log_set",
            args: {
              exercise_name: intent.exerciseName,
              reps: intent.reps,
              duration_seconds: intent.durationSeconds,
              weight: intent.weight,
              unit: intent.unit,
            },
          };
        case "today_summary":
          return { toolName: "get_today_summary", args: {} };
        case "exercise_report":
          return {
            toolName: "get_exercise_report",
            args: { exercise_name: intent.exerciseName },
          };
        case "set_weight_unit":
          return { toolName: "set_weight_unit", args: { unit: intent.unit } };
        case "set_sound":
          return { toolName: "set_sound", args: { enabled: intent.enabled } };
        default:
          return null;
      }
    })();

    if (callFromIntent) {
      toolsUsed.push(callFromIntent.toolName);
      const result = await executeToolWithStreaming(
        callFromIntent.toolName,
        callFromIntent.args,
        ctx,
        emitEvent
      );
      blocks = result.blocks;
      assistantText = result.summary;
    } else if (
      /\b(work on|focus|improve|today plan|what should i do)\b/i.test(userInput)
    ) {
      toolsUsed.push("get_focus_suggestions");
      const result = await executeToolWithStreaming(
        "get_focus_suggestions",
        {},
        ctx,
        emitEvent
      );
      blocks = result.blocks;
      assistantText = result.summary;
    } else {
      blocks = [
        {
          type: "status",
          tone: "info",
          title: "Try a workout command",
          description: "This fallback mode only handles core flows.",
        },
        {
          type: "suggestions",
          prompts: DEFAULT_COACH_SUGGESTIONS,
        },
      ];
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown fallback error";
    blocks = toolErrorBlocks(message);
    assistantText = "Fallback execution failed.";
  }

  return CoachTurnResponseSchema.parse({
    assistantText,
    blocks,
    trace: {
      toolsUsed,
      model: "fallback-deterministic",
      fallbackUsed: true,
    },
  });
}
