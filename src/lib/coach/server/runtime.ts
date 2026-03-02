import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

const DEFAULT_COACH_MODEL =
  process.env.COACH_AGENT_MODEL ?? "anthropic/claude-sonnet-4.6";

export type CoachRuntime = { model: LanguageModel; modelId: string };

export function getCoachRuntime(): CoachRuntime | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    console.warn(
      "[Coach] OPENROUTER_API_KEY missing; using deterministic fallback."
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
  };
}
