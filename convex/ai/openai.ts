/**
 * OpenAI Integration Module
 *
 * Handles API communication with OpenAI for generating workout analysis.
 * Includes retry logic, error handling, token tracking, and cost calculation.
 *
 * @module ai/openai
 */

import OpenAI from "openai";
import { systemPrompt, formatMetricsPrompt } from "./prompts";
import type { AnalyticsMetrics } from "./prompts";

/**
 * OpenAI Model Selection
 *
 * GPT-5-mini: Faster, cheaper (~$0.003/report), good for simple analysis
 * GPT-5: More capable, 4x cost (~$0.012/report), better context handling
 *
 * Set OPENAI_MODEL_TIER in Convex environment:
 * - "mini" (default): Use gpt-5-mini
 * - "full": Use gpt-5
 */
const MODEL_TIER = (process.env.OPENAI_MODEL_TIER || "mini") as "mini" | "full";

const MODEL_CONFIGS = {
  mini: {
    model: "gpt-5-mini" as const,
    reasoningEffort: "medium" as const, // Lowered from "high" to prevent connection timeouts
  },
  full: {
    model: "gpt-5" as const,
    reasoningEffort: "low" as const, // Lowered from "medium" for faster, more reliable bulk generation
  },
} as const;

/**
 * OpenAI API configuration
 */
const CONFIG = {
  ...MODEL_CONFIGS[MODEL_TIER],
  maxTokens: 3000, // Reasoning models use tokens for BOTH reasoning AND content
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  // Note: gpt-5 models only support default temperature (1.0) and cannot be customized
} as const;

/**
 * Pricing per 1M tokens (as of October 2025)
 * Source: https://openai.com/api/pricing/
 */
const PRICING_BY_MODEL = {
  mini: {
    inputPerMillion: 0.25, // $0.25 per 1M input tokens (GPT-5 mini)
    outputPerMillion: 2.0, // $2.00 per 1M output tokens (GPT-5 mini)
  },
  full: {
    inputPerMillion: 1.0, // $1.00 per 1M input tokens (GPT-5)
    outputPerMillion: 8.0, // $8.00 per 1M output tokens (GPT-5)
  },
} as const;

const PRICING = PRICING_BY_MODEL[MODEL_TIER];

/**
 * Token usage and cost information
 */
export interface TokenUsage {
  input: number;
  output: number;
  costUSD: number;
}

/**
 * Analysis result from OpenAI
 */
export interface AnalysisResult {
  content: string;
  tokenUsage: TokenUsage;
  model: string;
}

/**
 * Calculate cost in USD from token usage
 *
 * @param inputTokens - Number of input tokens consumed
 * @param outputTokens - Number of output tokens generated
 * @returns Cost in USD (to 4 decimal places)
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens * PRICING.inputPerMillion) / 1_000_000;
  const outputCost = (outputTokens * PRICING.outputPerMillion) / 1_000_000;
  return Number((inputCost + outputCost).toFixed(4));
}

/**
 * Sleep for exponential backoff retry logic with jitter
 *
 * Adds 20% random jitter to prevent synchronized retry storms ("thundering herd").
 * Critical for preventing connection errors when multiple reports retry simultaneously.
 *
 * @param attempt - Current retry attempt (0-indexed)
 * @returns Promise that resolves after randomized delay
 */
function sleep(attempt: number): Promise<void> {
  const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
  const jitter = baseDelay * 0.2 * Math.random(); // 20% random variance
  const delayMs = baseDelay + jitter;

  console.log(
    `[OpenAI] Retry backoff: ${delayMs.toFixed(0)}ms (attempt ${attempt + 1})`
  );
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Generate workout analysis using OpenAI
 *
 * Sends analytics metrics to GPT-5 mini for technical analysis and insights.
 * Includes automatic retry with exponential backoff for transient failures.
 * Uses medium reasoning effort for balanced depth and cost.
 *
 * @param metrics - Structured workout analytics data
 * @returns Analysis content, token usage, and cost information
 * @throws Error if API call fails after all retries
 *
 * @example
 * ```typescript
 * const metrics = {
 *   volume: [...],
 *   prs: [...],
 *   streak: {...},
 *   frequency: {...}
 * };
 * const result = await generateAnalysis(metrics);
 * console.log(result.content); // Markdown-formatted analysis
 * console.log(result.tokenUsage.costUSD); // e.g., 0.0023
 * ```
 */
export async function generateAnalysis(
  metrics: AnalyticsMetrics
): Promise<AnalysisResult> {
  // Initialize OpenAI client
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable not set. Add it to Convex environment variables."
    );
  }

  const openai = new OpenAI({
    apiKey,
    timeout: CONFIG.timeout,
  });

  // Format metrics into prompt
  const userPrompt = formatMetricsPrompt(metrics);

  // Retry loop with exponential backoff
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
    try {
      console.log(
        `[OpenAI] Generating analysis (attempt ${attempt + 1}/${CONFIG.maxRetries})...`
      );

      const completion = await openai.chat.completions.create({
        model: CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // Note: gpt-5-mini uses max_completion_tokens instead of max_tokens
        max_completion_tokens: CONFIG.maxTokens,
        reasoning_effort: CONFIG.reasoningEffort,
      });

      // Extract response content
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned empty response");
      }

      // Extract token usage
      const usage = completion.usage;
      if (!usage) {
        throw new Error("OpenAI did not return token usage information");
      }

      const tokenUsage: TokenUsage = {
        input: usage.prompt_tokens,
        output: usage.completion_tokens,
        costUSD: calculateCost(usage.prompt_tokens, usage.completion_tokens),
      };

      console.log(
        `[OpenAI] Success! Tokens: ${tokenUsage.input} in, ${tokenUsage.output} out, Cost: $${tokenUsage.costUSD}`
      );

      return {
        content: content.trim(),
        tokenUsage,
        model: CONFIG.model,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Log error details
      console.error(
        `[OpenAI] Attempt ${attempt + 1} failed:`,
        lastError.message
      );

      // Don't retry on certain error types
      if (
        lastError.message.includes("API key") ||
        lastError.message.includes("invalid_request")
      ) {
        console.error("[OpenAI] Non-retriable error detected, aborting");
        throw lastError;
      }

      // Sleep before retry (except on last attempt)
      if (attempt < CONFIG.maxRetries - 1) {
        await sleep(attempt);
      }
    }
  }

  // All retries exhausted
  console.error(`[OpenAI] All ${CONFIG.maxRetries} attempts failed`);
  throw new Error(
    `Failed to generate analysis after ${CONFIG.maxRetries} attempts: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Classify exercise into muscle groups using GPT-5-nano
 *
 * Uses minimal reasoning effort for simple classification task.
 * Cost: ~$0.0001 per exercise (10x cheaper than gpt-5-mini).
 *
 * @param exerciseName - Name of exercise to classify
 * @returns Array of muscle groups (Chest, Back, Shoulders, etc.)
 *
 * @example
 * ```typescript
 * const groups = await classifyExercise("Hammer Pull-ups");
 * // Returns: ["Back", "Biceps"]
 * ```
 */
export async function classifyExercise(
  exerciseName: string
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const openai = new OpenAI({ apiKey, timeout: 10000 });

  const systemPrompt = `You are a fitness exercise classifier. Classify exercises into one or more of these muscle groups:

Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Core

Rules:
- Return ONLY the muscle group names, comma-separated
- Use compound classification for multi-joint exercises (e.g., "Bench Press" → "Chest, Triceps")
- If unknown/unclear, return "Other"
- No explanations, just the list

Examples:
- "Bench Press" → "Chest, Triceps"
- "Pull-ups" → "Back, Biceps"
- "Squats" → "Quads, Glutes"
- "Plank" → "Core"
- "Hammer Curls" → "Biceps"`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Classify: ${exerciseName}` },
      ],
      // Note: gpt-5-nano only supports default temperature (1) and reasoning_effort
      max_completion_tokens: 50, // Short response (gpt-5-nano uses max_completion_tokens, not max_tokens)
      reasoning_effort: "minimal", // Fastest, cheapest
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return ["Other"];

    // Parse comma-separated list
    const groups = content
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    return groups.length > 0 ? groups : ["Other"];
  } catch (error) {
    console.error(`[OpenAI] Exercise classification failed:`, error);
    return ["Other"]; // Fallback to prevent blocking exercise creation
  }
}

/**
 * Check if OpenAI API is configured and accessible
 *
 * Useful for health checks and configuration validation.
 *
 * @returns True if API key is set, false otherwise
 */
export function isConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get current pricing configuration
 *
 * Useful for displaying cost estimates to users or admins.
 *
 * @returns Pricing structure in dollars per 1M tokens
 */
export function getPricing() {
  return PRICING;
}
