/**
 * OpenAI V2 Integration with Structured Outputs
 *
 * Uses OpenAI's native JSON schema enforcement for 100% schema compliance.
 * Only generates creative content (celebration + action)—metrics are computed.
 *
 * @module ai/openaiV2
 */

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  AICreativeOutputSchema,
  type AICreativeContext,
  type AICreativeResult,
} from "./reportV2Schema";
import { systemPromptV2, formatCreativePrompt } from "./promptsV2";

/**
 * Model configuration for v2 reports
 *
 * Uses gpt-5-mini with structured outputs for guaranteed JSON compliance.
 * Lower token limits since we're only generating creative content.
 */
const CONFIG = {
  model: "gpt-5-mini" as const,
  maxCompletionTokens: 1500, // Structured JSON needs more tokens than plain text
  reasoningEffort: "low" as const, // Simple creative task
  timeout: 30000, // 30 seconds to match v1
} as const;

/**
 * Pricing per 1M tokens (GPT-5 mini, October 2025)
 */
const PRICING = {
  inputPerMillion: 0.25,
  outputPerMillion: 2.0,
} as const;

/**
 * Calculate cost from token usage
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens * PRICING.inputPerMillion) / 1_000_000;
  const outputCost = (outputTokens * PRICING.outputPerMillion) / 1_000_000;
  return Number((inputCost + outputCost).toFixed(4));
}

/**
 * Generate creative content using OpenAI Structured Outputs
 *
 * Uses native JSON schema enforcement for 100% compliance.
 * Only generates celebration copy and action directive.
 *
 * @param context - Workout context for creative generation
 * @returns Creative content with token usage
 */
export async function generateCreativeContent(
  context: AICreativeContext
): Promise<AICreativeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[OpenAI V2] No API key - using fallback content");
    return fallbackCreativeContent(context);
  }

  const openai = new OpenAI({
    apiKey,
    timeout: CONFIG.timeout,
  });

  const userPrompt = formatCreativePrompt(context);

  try {
    console.log("[OpenAI V2] Generating creative content...");

    const completion = await openai.chat.completions.parse({
      model: CONFIG.model,
      messages: [
        { role: "system", content: systemPromptV2 },
        { role: "user", content: userPrompt },
      ],
      response_format: zodResponseFormat(
        AICreativeOutputSchema,
        "creative_content"
      ),
      max_completion_tokens: CONFIG.maxCompletionTokens,
      reasoning_effort: CONFIG.reasoningEffort,
    });

    // Handle refusal (safety content)
    const message = completion.choices[0]?.message;
    if (message?.refusal) {
      console.error("[OpenAI V2] Refusal:", message.refusal);
      return fallbackCreativeContent(context);
    }

    // Parsed response is already validated by Zod
    const parsed = message?.parsed;
    if (!parsed) {
      console.error("[OpenAI V2] No parsed content received");
      return fallbackCreativeContent(context);
    }

    const usage = completion.usage;
    const tokenUsage = {
      input: usage?.prompt_tokens ?? 0,
      output: usage?.completion_tokens ?? 0,
      costUSD: calculateCost(
        usage?.prompt_tokens ?? 0,
        usage?.completion_tokens ?? 0
      ),
    };

    console.log(
      `[OpenAI V2] Success! Tokens: ${tokenUsage.input} in, ${tokenUsage.output} out, Cost: $${tokenUsage.costUSD}`
    );

    return {
      ...parsed,
      model: CONFIG.model,
      tokenUsage,
    };
  } catch (error) {
    console.error("[OpenAI V2] Generation failed:", error);
    return fallbackCreativeContent(context);
  }
}

/**
 * Fallback content when AI is unavailable
 *
 * Returns generic but motivational content to prevent report generation failure.
 */
function fallbackCreativeContent(context: AICreativeContext): AICreativeResult {
  // With nullable schema, all fields must be present (set to null if not applicable)
  if (context.hasPR && context.exerciseName) {
    return {
      prCelebration: {
        headline: `${context.exerciseName.toUpperCase()} PR!`,
        celebrationCopy: "Great work pushing your limits!",
        nextMilestone: "Keep the momentum going.",
      },
      prEmptyMessage: null,
      action: {
        directive: "Keep up your current routine.",
        rationale: "Consistency is the foundation of progress.",
      },
      model: "fallback",
      tokenUsage: { input: 0, output: 0, costUSD: 0 },
    };
  }

  return {
    prCelebration: null,
    prEmptyMessage:
      "No PRs this week—but consistency builds the foundation for breakthroughs.",
    action: {
      directive: "Keep up your current routine.",
      rationale: "Consistency is the foundation of progress.",
    },
    model: "fallback",
    tokenUsage: { input: 0, output: 0, costUSD: 0 },
  };
}
