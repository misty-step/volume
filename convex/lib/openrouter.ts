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
 * - MAIN: Claude Sonnet 4.6 - Agentic tool composition and reasoning
 * - CLASSIFICATION: MiniMax M2.5 - Cheap + reliable for short classification calls
 * - WRITER: Kimi K2.5 - Strong writing model (e.g. release notes)
 * - FALLBACK: GLM-5 - Alternate provider for resiliency
 */
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6" as const;
export const MODELS = {
  /** Claude Sonnet 4.6 - default for agentic flows and tool composition */
  MAIN: DEFAULT_MODEL,
  /** MiniMax M2.5 - used for short classification calls */
  CLASSIFICATION: "minimax/minimax-m2.5",
  /** Kimi K2.5 - writing-focused tasks */
  WRITER: "moonshotai/kimi-k2.5",
  /** GLM-5 - alternate model for fallback paths */
  FALLBACK: "z-ai/glm-5",
} as const;

/**
 * Pricing per 1M tokens (approximate, varies by model)
 * Used for cost tracking and estimation
 */
export const PRICING = {
  [DEFAULT_MODEL]: {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  [MODELS.CLASSIFICATION]: {
    inputPerMillion: 0.3,
    outputPerMillion: 1.2,
  },
  [MODELS.WRITER]: {
    inputPerMillion: 0.23,
    outputPerMillion: 3.0,
  },
  [MODELS.FALLBACK]: {
    inputPerMillion: 0.3,
    outputPerMillion: 2.55,
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
