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
    const normalized = userInput.toLowerCase().trim();

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
            toolName: "get_exercise_snapshot",
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
      /\b(work on|focus|improve|today plan|what should i do)\b/i.test(
        normalized
      )
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
    } else if (/\b(history|recent sets|past workouts)\b/i.test(normalized)) {
      toolsUsed.push("get_history_overview");
      const result = await executeToolWithStreaming(
        "get_history_overview",
        {},
        ctx,
        emitEvent
      );
      blocks = result.blocks;
      assistantText = result.summary;
    } else if (/\b(analytics|streak|prs?|overload)\b/i.test(normalized)) {
      toolsUsed.push("get_analytics_overview");
      const result = await executeToolWithStreaming(
        "get_analytics_overview",
        {},
        ctx,
        emitEvent
      );
      blocks = result.blocks;
      assistantText = result.summary;
    } else if (
      /\b(exercise library|all exercises|exercise list)\b/i.test(normalized)
    ) {
      toolsUsed.push("get_exercise_library");
      const result = await executeToolWithStreaming(
        "get_exercise_library",
        {},
        ctx,
        emitEvent
      );
      blocks = result.blocks;
      assistantText = result.summary;
    } else if (
      /\b(settings|preferences|billing|subscription)\b/i.test(normalized)
    ) {
      toolsUsed.push("get_settings_overview");
      const result = await executeToolWithStreaming(
        "get_settings_overview",
        {},
        ctx,
        emitEvent
      );
      blocks = result.blocks;
      assistantText = result.summary;
    } else if (/\b(report history|reports)\b/i.test(normalized)) {
      toolsUsed.push("get_report_history");
      const result = await executeToolWithStreaming(
        "get_report_history",
        {},
        ctx,
        emitEvent
      );
      blocks = result.blocks;
      assistantText = result.summary;
    } else if (/\b(workspace|capabilities|help)\b/i.test(normalized)) {
      toolsUsed.push("show_workspace");
      const result = await executeToolWithStreaming(
        "show_workspace",
        {},
        ctx,
        emitEvent
      );
      blocks = result.blocks;
      assistantText = result.summary;
    } else if (/^rename exercise (.+?) to (.+)$/i.test(normalized)) {
      const matches = normalized.match(/^rename exercise (.+?) to (.+)$/i);
      if (matches) {
        toolsUsed.push("rename_exercise");
        const result = await executeToolWithStreaming(
          "rename_exercise",
          {
            exercise_name: matches[1],
            new_name: matches[2],
          },
          ctx,
          emitEvent
        );
        blocks = result.blocks;
        assistantText = result.summary;
      }
    } else if (/^delete exercise (.+)$/i.test(normalized)) {
      const matches = normalized.match(/^delete exercise (.+)$/i);
      if (matches) {
        toolsUsed.push("delete_exercise");
        const result = await executeToolWithStreaming(
          "delete_exercise",
          { exercise_name: matches[1] },
          ctx,
          emitEvent
        );
        blocks = result.blocks;
        assistantText = result.summary;
      }
    } else if (/^restore exercise (.+)$/i.test(normalized)) {
      const matches = normalized.match(/^restore exercise (.+)$/i);
      if (matches) {
        toolsUsed.push("restore_exercise");
        const result = await executeToolWithStreaming(
          "restore_exercise",
          { exercise_name: matches[1] },
          ctx,
          emitEvent
        );
        blocks = result.blocks;
        assistantText = result.summary;
      }
    } else if (/^delete set ([a-z0-9_-]+)$/i.test(normalized)) {
      const matches = normalized.match(/^delete set ([a-z0-9_-]+)$/i);
      if (matches) {
        toolsUsed.push("delete_set");
        const result = await executeToolWithStreaming(
          "delete_set",
          { set_id: matches[1] },
          ctx,
          emitEvent
        );
        blocks = result.blocks;
        assistantText = result.summary;
      }
    } else if (/^set muscle groups for (.+):\s*(.+)$/i.test(normalized)) {
      const matches = normalized.match(/^set muscle groups for (.+):\s*(.+)$/i);
      if (matches) {
        const groups = matches[2]!
          .split(",")
          .map((group) => group.trim())
          .filter(Boolean);
        toolsUsed.push("update_exercise_muscle_groups");
        const result = await executeToolWithStreaming(
          "update_exercise_muscle_groups",
          {
            exercise_name: matches[1],
            muscle_groups: groups,
          },
          ctx,
          emitEvent
        );
        blocks = result.blocks;
        assistantText = result.summary;
      }
    } else if (/^set training split to (.+)$/i.test(normalized)) {
      const matches = normalized.match(/^set training split to (.+)$/i);
      if (matches) {
        toolsUsed.push("update_preferences");
        const result = await executeToolWithStreaming(
          "update_preferences",
          { training_split: matches[1] },
          ctx,
          emitEvent
        );
        blocks = result.blocks;
        assistantText = result.summary;
      }
    } else if (/^set coach notes to (.+)$/i.test(normalized)) {
      const matches = normalized.match(/^set coach notes to (.+)$/i);
      if (matches) {
        toolsUsed.push("update_preferences");
        const result = await executeToolWithStreaming(
          "update_preferences",
          { coach_notes: matches[1] },
          ctx,
          emitEvent
        );
        blocks = result.blocks;
        assistantText = result.summary;
      }
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
