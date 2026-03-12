import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import {
  MODELS,
  RUNTIME_CONFIG,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  resolveCoachModelId,
} from "@/lib/openrouter/policy";

export type CoachRuntime = {
  model: LanguageModel;
  modelId: string;
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

  const modelId = resolveCoachModelId();
  const openrouter = createOpenRouter({
    apiKey: openRouterKey,
    headers: getOpenRouterHeaders(RUNTIME_CONFIG.coachAppTitle),
  });

  return {
    model: openrouter(modelId),
    modelId,
    classificationModel: openrouter(MODELS.CLASSIFICATION),
  };
}
