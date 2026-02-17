import OpenAI from "openai";
import {
  CoachTurnResponseSchema,
  DEFAULT_COACH_SUGGESTIONS,
  type CoachBlock,
  type CoachTurnResponse,
} from "@/lib/coach/schema";

export function normalizeAssistantText(
  content: OpenAI.Chat.Completions.ChatCompletionMessage["content"]
): string {
  if (typeof content === "string") {
    return content.trim();
  }
  return "";
}

export function toolErrorBlocks(message: string): CoachBlock[] {
  return [
    {
      type: "status",
      tone: "error",
      title: "Tool execution failed",
      description: message,
    },
    {
      type: "suggestions",
      prompts: DEFAULT_COACH_SUGGESTIONS,
    },
  ];
}

export function buildCoachTurnResponse({
  assistantText,
  blocks,
  toolsUsed,
  model,
  fallbackUsed,
}: {
  assistantText: string;
  blocks: CoachBlock[];
  toolsUsed: string[];
  model: string;
  fallbackUsed: boolean;
}): CoachTurnResponse {
  const finalAssistantText = assistantText.trim()
    ? assistantText.trim()
    : "Done. I used your workout data and generated updates below.";
  const finalBlocks =
    blocks.length > 0
      ? blocks
      : [{ type: "suggestions", prompts: DEFAULT_COACH_SUGGESTIONS }];

  return CoachTurnResponseSchema.parse({
    assistantText: finalAssistantText,
    blocks: finalBlocks,
    trace: {
      toolsUsed,
      model,
      fallbackUsed,
    },
  });
}
