/**
 * OpenRouter Integration Module
 *
 * Handles API communication via OpenRouter for generating workout analysis.
 * Includes retry logic, error handling, token tracking, and cost calculation.
 *
 * Uses Gemini 3 Flash for analysis and GPT-5 nano for classification.
 *
 * @module ai/openai
 */

import OpenAI from "openai";
import { systemPrompt, formatMetricsPrompt } from "./prompts";
import type { AnalyticsMetrics } from "./prompts";
import { filterValidMuscleGroups } from "../lib/muscleGroups";
import {
  createOpenRouterClient,
  MODELS,
  calculateCost,
  isConfigured,
} from "../lib/openrouter";

/**
 * Configuration for workout analysis
 */
const CONFIG = {
  model: MODELS.MAIN,
  maxTokens: 3000,
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  temperature: 0.7,
} as const;

/**
 * Token usage and cost information
 */
export interface TokenUsage {
  input: number;
  output: number;
  costUSD: number;
}

/**
 * Analysis result from OpenRouter
 */
export interface AnalysisResult {
  content: string;
  tokenUsage: TokenUsage;
  model: string;
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
    `[OpenRouter] Retry backoff: ${delayMs.toFixed(0)}ms (attempt ${attempt + 1})`
  );
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Generate workout analysis using OpenRouter (Gemini 3 Flash)
 *
 * Sends analytics metrics for technical analysis and insights.
 * Includes automatic retry with exponential backoff for transient failures.
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
  const client = createOpenRouterClient();
  if (!client) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable not set. Add it to Convex environment variables."
    );
  }

  // Format metrics into prompt
  const userPrompt = formatMetricsPrompt(metrics);

  // Retry loop with exponential backoff
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
    try {
      console.log(
        `[OpenRouter] Generating analysis (attempt ${attempt + 1}/${CONFIG.maxRetries})...`
      );

      const completion = await client.chat.completions.create({
        model: CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature,
      });

      // Extract response content
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenRouter returned empty response");
      }

      // Extract token usage
      const usage = completion.usage;
      if (!usage) {
        throw new Error("OpenRouter did not return token usage information");
      }

      const tokenUsage: TokenUsage = {
        input: usage.prompt_tokens,
        output: usage.completion_tokens,
        costUSD: calculateCost(MODELS.MAIN, usage.prompt_tokens, usage.completion_tokens),
      };

      console.log(
        `[OpenRouter] Success! Tokens: ${tokenUsage.input} in, ${tokenUsage.output} out, Cost: $${tokenUsage.costUSD}`
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
        `[OpenRouter] Attempt ${attempt + 1} failed:`,
        lastError.message
      );

      // Don't retry on certain error types
      if (
        lastError.message.includes("API key") ||
        lastError.message.includes("invalid_request") ||
        lastError.message.includes("authentication")
      ) {
        console.error("[OpenRouter] Non-retriable error detected, aborting");
        throw lastError;
      }

      // Sleep before retry (except on last attempt)
      if (attempt < CONFIG.maxRetries - 1) {
        await sleep(attempt);
      }
    }
  }

  // All retries exhausted
  console.error(`[OpenRouter] All ${CONFIG.maxRetries} attempts failed`);
  throw new Error(
    `Failed to generate analysis after ${CONFIG.maxRetries} attempts: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Deterministic exercise classification fallback (used in tests)
 *
 * Provides basic pattern matching for common exercises when API is unavailable.
 * Ensures tests are deterministic and don't depend on external services.
 *
 * @param exerciseName - Name of exercise to classify
 * @returns Array of muscle groups based on pattern matching
 */
function classifyExerciseFallback(exerciseName: string): string[] {
  const lower = exerciseName.toLowerCase();

  // Pattern matching for common exercises
  if (
    lower.includes("bench") ||
    lower.includes("chest") ||
    lower.includes("pec") ||
    lower.includes("dip")
  ) {
    return ["Chest", "Triceps"];
  }
  if (
    lower.includes("pull-up") ||
    lower.includes("pullup") ||
    lower.includes("row") ||
    lower.includes("back")
  ) {
    return ["Back", "Biceps"];
  }
  if (
    lower.includes("squat") ||
    lower.includes("leg press") ||
    lower.includes("quad")
  ) {
    return ["Quads", "Glutes"];
  }
  if (
    lower.includes("deadlift") ||
    lower.includes("hamstring") ||
    lower.includes("rdl")
  ) {
    return ["Back", "Hamstrings", "Glutes"];
  }
  if (lower.includes("shoulder") || lower.includes("press")) {
    return ["Shoulders", "Triceps"];
  }
  if (lower.includes("curl") || lower.includes("bicep")) {
    return ["Biceps"];
  }
  if (lower.includes("tricep") || lower.includes("extension")) {
    return ["Triceps"];
  }
  if (lower.includes("calf") || lower.includes("raise")) {
    return ["Calves"];
  }
  if (
    lower.includes("plank") ||
    lower.includes("crunch") ||
    lower.includes("ab") ||
    lower.includes("core")
  ) {
    return ["Core"];
  }
  if (lower.includes("incline")) {
    return ["Chest", "Triceps"];
  }
  if (lower.includes("lunge")) {
    return ["Quads", "Glutes"];
  }

  // Default fallback
  return ["Other"];
}

/**
 * Classify exercise into muscle groups using GPT-5 nano via OpenRouter
 *
 * Uses the cheapest available model for simple classification tasks.
 * Falls back to pattern matching if API key is not configured (test environments).
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
  const client = createOpenRouterClient();
  if (!client) {
    // Use deterministic fallback in test environments
    console.log(
      `[OpenRouter] No API key - using fallback classification for "${exerciseName}"`
    );
    return classifyExerciseFallback(exerciseName);
  }

  const systemPromptText = `You are a fitness exercise classifier. Classify exercises into one or more of these muscle groups:

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
    const completion = await client.chat.completions.create({
      model: MODELS.CLASSIFICATION,
      messages: [
        { role: "system", content: systemPromptText },
        { role: "user", content: `Classify: ${exerciseName}` },
      ],
      max_tokens: 50, // Short response
      temperature: 0.3, // Low temperature for consistent classification
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return classifyExerciseFallback(exerciseName);

    // Parse comma-separated list and filter to valid groups only
    const rawGroups = content
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    // Filter AI response to canonical muscle groups (garbage like "(and possibly...)" → "Other")
    return filterValidMuscleGroups(rawGroups);
  } catch (error) {
    console.error(`[OpenRouter] Exercise classification failed:`, error);
    return classifyExerciseFallback(exerciseName); // Fallback to prevent blocking exercise creation
  }
}

/**
 * Check if OpenRouter API is configured and accessible
 *
 * Useful for health checks and configuration validation.
 *
 * @returns True if API key is set, false otherwise
 */
export { isConfigured };

/**
 * Get current pricing configuration
 *
 * Useful for displaying cost estimates to users or admins.
 *
 * @returns Pricing structure in dollars per 1M tokens
 */
export function getPricing() {
  return {
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
  };
}
