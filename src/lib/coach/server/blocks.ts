import type OpenAI from "openai";
import {
  CoachTurnResponseSchema,
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

export function toolErrorBlocks(message: string) {
  return [
    {
      type: "status" as const,
      tone: "error" as const,
      title: "Tool execution failed",
      description: sanitizeError(message),
    },
  ];
}

export function buildRuntimeUnavailableResponse(): CoachTurnResponse {
  return buildCoachTurnResponse({
    assistantText: "I can't process that request right now.",
    toolsUsed: [],
    model: "runtime-unavailable",
    fallbackUsed: false,
    responseMessages: [],
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
    assistantText: `I hit an error while planning this turn. ${sanitizeError(errorMessage)}`,
    toolsUsed: [],
    model: `${modelId} (planner_failed)`,
    fallbackUsed: false,
    responseMessages: [],
  });
}

export function buildPlannerPartialFailureResponse({
  modelId,
  errorMessage,
  toolsUsed,
  responseMessages,
}: {
  modelId: string;
  errorMessage: string;
  toolsUsed: string[];
  responseMessages?: unknown[];
}): CoachTurnResponse {
  return buildCoachTurnResponse({
    assistantText: `I hit an error while finishing that. ${sanitizeError(errorMessage)}`,
    toolsUsed,
    model: `${modelId} (planner_failed_partial)`,
    fallbackUsed: false,
    responseMessages,
  });
}

export function buildCoachTurnResponse({
  assistantText,
  toolsUsed,
  model,
  fallbackUsed,
  responseMessages,
}: {
  assistantText: string;
  toolsUsed: string[];
  model: string;
  fallbackUsed: boolean;
  responseMessages?: unknown[];
}): CoachTurnResponse {
  return CoachTurnResponseSchema.parse({
    assistantText: assistantText.trim(),
    responseMessages,
    trace: {
      toolsUsed,
      model,
      fallbackUsed,
    },
  });
}
