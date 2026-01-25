/**
 * OpenRouter Configuration
 *
 * Unified LLM gateway providing access to 400+ models via OpenAI-compatible API.
 * All AI features in Volume use OpenRouter for consistent billing and routing.
 *
 * @module lib/openrouter
 */

import OpenAI from "openai";

/**
 * OpenRouter base URL for API requests
 */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Model configurations for different use cases
 *
 * - MAIN: Gemini 3 Flash - Best cost/performance for creative tasks
 * - CLASSIFICATION: GPT-5 nano - Cheapest option for simple classification
 */
export const MODELS = {
  /** Gemini 3 Flash - optimal for analysis and report generation */
  MAIN: "google/gemini-3-flash-preview",
  /** GPT-5 nano - cheapest option for simple classification tasks */
  CLASSIFICATION: "openai/gpt-5-nano",
} as const;

/**
 * Pricing per 1M tokens (approximate, varies by model)
 * Used for cost tracking and estimation
 */
export const PRICING = {
  [MODELS.MAIN]: {
    inputPerMillion: 0.10,   // Gemini 3 Flash pricing
    outputPerMillion: 0.40,
  },
  [MODELS.CLASSIFICATION]: {
    inputPerMillion: 0.10,   // GPT-5 nano pricing
    outputPerMillion: 0.40,
  },
} as const;

/**
 * Create an OpenRouter client configured for Convex
 *
 * Uses OPENROUTER_API_KEY environment variable.
 * Falls back gracefully if not configured (for test environments).
 *
 * @returns OpenAI client configured for OpenRouter, or null if not configured
 */
export function createOpenRouterClient(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    return new OpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://volume.fitness",
        "X-Title": "Volume",
      },
      timeout: 30000, // 30 seconds
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
  return !!process.env.OPENROUTER_API_KEY;
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
