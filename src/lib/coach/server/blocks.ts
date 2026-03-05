import type OpenAI from "openai";
import {
  CoachTurnResponseSchema,
  DEFAULT_COACH_SUGGESTIONS,
  type CoachBlock,
  type CoachTurnResponse,
} from "@/lib/coach/schema";
import { sanitizeError } from "@/lib/coach/sanitize-error";

export function normalizeAssistantText(
  content: OpenAI.Chat.Completions.ChatCompletionMessage["content"]
): string {
  if (typeof content !== "string") return "";
  // Some models embed reasoning in <think>...</think> tags via OpenRouter.
  const stripped = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "") // complete blocks
    .replace(/<think>[\s\S]*/gi, "") // unclosed opening (stream cut off)
    .replace(/[\s\S]*<\/think>/gi, ""); // orphaned closing tag
  return stripped.trim();
}

export function toolErrorBlocks(message: string): CoachBlock[] {
  return [
    {
      type: "status",
      tone: "error",
      title: "Tool execution failed",
      description: sanitizeError(message),
    },
    {
      type: "suggestions",
      prompts: DEFAULT_COACH_SUGGESTIONS,
    },
  ];
}

export function runtimeUnavailableBlocks(): CoachBlock[] {
  return [
    {
      type: "status",
      tone: "error",
      title: "Coach is unavailable",
      description:
        "The AI runtime is unavailable right now. Please try again shortly.",
    },
    {
      type: "suggestions",
      prompts: DEFAULT_COACH_SUGGESTIONS,
    },
  ];
}

export function buildRuntimeUnavailableResponse(): CoachTurnResponse {
  return buildCoachTurnResponse({
    assistantText: "I can't process that request right now.",
    blocks: runtimeUnavailableBlocks(),
    toolsUsed: [],
    model: "runtime-unavailable",
    fallbackUsed: false,
  });
}

export function buildPlannerFailedResponse({
  modelId,
  errorMessage,
}: {
  modelId: string;
  errorMessage: string;
}): CoachTurnResponse {
  return buildCoachTurnResponse({
    assistantText: "I hit an error while planning this turn.",
    blocks: toolErrorBlocks(errorMessage),
    toolsUsed: [],
    model: `${modelId} (planner_failed)`,
    fallbackUsed: false,
    responseMessages: [],
  });
}

export function buildCoachTurnResponse({
  assistantText,
  blocks,
  toolsUsed,
  model,
  fallbackUsed,
  responseMessages,
}: {
  assistantText: string;
  blocks: CoachBlock[];
  toolsUsed: string[];
  model: string;
  fallbackUsed: boolean;
  responseMessages?: unknown[];
}): CoachTurnResponse {
  const finalAssistantText = assistantText.trim();
  const finalBlocks =
    blocks.length > 0
      ? blocks
      : [{ type: "suggestions", prompts: DEFAULT_COACH_SUGGESTIONS }];

  return CoachTurnResponseSchema.parse({
    assistantText: finalAssistantText,
    blocks: finalBlocks,
    responseMessages,
    trace: {
      toolsUsed,
      model,
      fallbackUsed,
    },
  });
}
