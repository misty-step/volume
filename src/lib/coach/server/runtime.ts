import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

const DEFAULT_COACH_MODEL =
  process.env.COACH_AGENT_MODEL ?? "anthropic/claude-sonnet-4.6";

// Cheap model for short classification tasks (exercise name matching).
// MiniMax M2.5: $0.30/$1.20 per M tokens vs Sonnet 4.6: $3/$15 per M tokens.
const CLASSIFICATION_MODEL = "minimax/minimax-m2.5";

export type CoachRuntime = {
  model: LanguageModel;
  modelId: string;
  classificationModel: LanguageModel;
};

export function getCoachRuntime(): CoachRuntime | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!openRouterKey) {
    console.warn(
      "[Coach] OPENROUTER_API_KEY missing; coach runtime unavailable."
    );
    return null;
  }

  const openrouter = createOpenRouter({
    apiKey: openRouterKey,
    headers: {
      "HTTP-Referer": "https://volume.fitness",
      "X-Title": "Volume Coach",
    },
  });

  return {
    model: openrouter(DEFAULT_COACH_MODEL),
    modelId: DEFAULT_COACH_MODEL,
    classificationModel: openrouter(CLASSIFICATION_MODEL),
  };
}
