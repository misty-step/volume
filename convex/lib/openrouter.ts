import OpenAI from "openai";
import {
  MODELS,
  OPENROUTER_BASE_URL,
  PRICING,
  ROUTING_POLICY,
  RUNTIME_CONFIG,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  isOpenRouterConfigured,
} from "@/lib/openrouter/policy";

export { MODELS, OPENROUTER_BASE_URL, PRICING, ROUTING_POLICY, RUNTIME_CONFIG };

/**
 * Create an OpenRouter client configured for Convex
 *
 * Uses OPENROUTER_API_KEY environment variable.
 * Falls back gracefully if not configured (for test environments).
 *
 * @returns OpenAI client configured for OpenRouter, or null if not configured
 */
export function createOpenRouterClient(): OpenAI | null {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    return new OpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey,
      defaultHeaders: getOpenRouterHeaders(),
      timeout: RUNTIME_CONFIG.timeoutMs,
    });
  } catch {
    // OpenAI SDK throws in browser-like environments (e.g., vitest with jsdom)
    // Return null to trigger fallback classification
    return null;
  }
}

/**
 * Check if OpenRouter is configured
 *
 * @returns True if OPENROUTER_API_KEY is set
 */
export function isConfigured(): boolean {
  return isOpenRouterConfigured();
}

/**
 * Calculate cost in USD from token usage
 *
 * @param model - Model identifier
 * @param inputTokens - Number of input tokens consumed
 * @param outputTokens - Number of output tokens generated
 * @returns Cost in USD (to 4 decimal places)
 */
export function calculateCost(
  model: keyof typeof PRICING,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model] || PRICING[MODELS.MAIN];
  const inputCost = (inputTokens * pricing.inputPerMillion) / 1_000_000;
  const outputCost = (outputTokens * pricing.outputPerMillion) / 1_000_000;
  return Number((inputCost + outputCost).toFixed(4));
}
