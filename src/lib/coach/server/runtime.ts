import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import {
  RUNTIME_CONFIG,
  ROUTING_POLICY,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  resolveCoachModelChain,
} from "@/lib/openrouter/policy";

export type FallbackRuntime = {
  model: LanguageModel;
  modelId: string;
};

export type CoachRuntime = {
  model: LanguageModel;
  modelId: string;
  /** Ordered fallback models (does NOT include the primary). */
  fallbacks: FallbackRuntime[];
  classificationModel: LanguageModel;
};

export function getCoachRuntime(): CoachRuntime | null {
  const openRouterKey = getOpenRouterApiKey();
  if (!openRouterKey) {
    console.warn(
      `[Coach] ${RUNTIME_CONFIG.apiKeyEnvVar} missing; coach runtime unavailable.`
    );
    return null;
  }

  const chain = resolveCoachModelChain();
  const openrouter = createOpenRouter({
    apiKey: openRouterKey,
    headers: getOpenRouterHeaders(RUNTIME_CONFIG.coachAppTitle),
  });

  // Chain is always non-empty: override produces [override], default has 3 models.
  const primaryId = chain[0]!;
  const fallbackIds = chain.slice(1);

  return {
    model: openrouter(primaryId),
    modelId: primaryId,
    fallbacks: fallbackIds.map((id) => ({
      model: openrouter(id),
      modelId: id,
    })),
    classificationModel: openrouter(ROUTING_POLICY.CLASSIFICATION),
  };
}
