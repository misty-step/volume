/**
 * LLM Integration for AI Reports
 *
 * Uses Gemini 3 Flash via OpenRouter for creative content generation.
 * Validates responses with Zod for schema compliance.
 * Only generates creative content (celebration + action)—metrics are computed.
 *
 * @module ai/llm
 */

import {
  AICreativeOutputSchema,
  type AICreativeContext,
  type AICreativeResult,
} from "./reportSchema";
import { systemPrompt, formatCreativePrompt } from "./prompts";
import {
  createOpenRouterClient,
  MODELS,
  calculateCost,
} from "../lib/openrouter";

/**
 * Model configuration
 *
 * Uses Gemini 3 Flash via OpenRouter with JSON mode.
 * Zod validates responses after parsing.
 */
const CONFIG = {
  model: MODELS.MAIN,
  maxTokens: 1500,
  temperature: 0.7,
  maxRetries: 3,
} as const;

/**
 * Sleep with exponential backoff + jitter
 *
 * Prevents thundering herd on retry and respects rate limits.
 */
function sleep(attempt: number): Promise<void> {
  const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
  const jitter = baseDelay * 0.2 * Math.random(); // 20% random variance
  const delayMs = baseDelay + jitter;

  console.log(
    `[LLM] Retry backoff: ${delayMs.toFixed(0)}ms (attempt ${attempt + 1})`
  );
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Check if error is non-retriable (e.g., invalid API key, bad request)
 */
function isNonRetriableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("api key") ||
    message.includes("invalid_request") ||
    message.includes("invalid_api_key") ||
    message.includes("authentication")
  );
}

/**
 * JSON schema instruction for the prompt
 * Ensures the model returns valid JSON matching our schema.
 */
const JSON_SCHEMA_INSTRUCTION = `
IMPORTANT: Respond with ONLY valid JSON matching this exact structure:
{
  "prCelebration": null | { "headline": string, "celebrationCopy": string, "nextMilestone": string },
  "prEmptyMessage": null | string,
  "action": { "directive": string, "rationale": string }
}

Rules:
- If hasPR is true: set prCelebration object, set prEmptyMessage to null
- If hasPR is false: set prCelebration to null, set prEmptyMessage to a string
- action is always required with both directive and rationale
- Return ONLY the JSON object, no markdown, no explanation`;

/**
 * Generate creative content using OpenRouter (Gemini 3 Flash)
 *
 * Uses JSON mode with Zod validation for schema compliance.
 * Only generates celebration copy and action directive.
 *
 * @param context - Workout context for creative generation
 * @returns Creative content with token usage
 */
export async function generateCreativeContent(
  context: AICreativeContext
): Promise<AICreativeResult> {
  const client = createOpenRouterClient();
  if (!client) {
    console.log("[LLM] No API key - using fallback content");
    return fallbackCreativeContent(context);
  }

  const userPrompt = formatCreativePrompt(context);
  const fullPrompt = `${userPrompt}\n\n${JSON_SCHEMA_INSTRUCTION}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
    try {
      console.log(
        `[LLM] Generating creative content (attempt ${attempt + 1}/${CONFIG.maxRetries})...`
      );

      const completion = await client.chat.completions.create({
        model: CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error("[LLM] No content received");
        return fallbackCreativeContent(context);
      }

      // Parse JSON and validate with Zod
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(content);
      } catch (parseError) {
        console.error("[LLM] Invalid JSON:", content.slice(0, 200));
        throw new Error("Invalid JSON response from model");
      }

      const parseResult = AICreativeOutputSchema.safeParse(rawJson);
      if (!parseResult.success) {
        console.error(
          "[LLM] Schema validation failed:",
          parseResult.error.issues
        );
        throw new Error(
          `Schema validation failed: ${parseResult.error.issues[0]?.message}`
        );
      }

      const parsed = parseResult.data;
      const usage = completion.usage;
      const tokenUsage = {
        input: usage?.prompt_tokens ?? 0,
        output: usage?.completion_tokens ?? 0,
        costUSD: calculateCost(
          CONFIG.model,
          usage?.prompt_tokens ?? 0,
          usage?.completion_tokens ?? 0
        ),
      };

      console.log(
        `[LLM] Success! Tokens: ${tokenUsage.input} in, ${tokenUsage.output} out, Cost: $${tokenUsage.costUSD}`
      );

      return {
        ...parsed,
        model: CONFIG.model,
        tokenUsage,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-retriable errors
      if (isNonRetriableError(lastError)) {
        console.error(
          "[LLM] Non-retriable error, aborting:",
          lastError.message
        );
        return fallbackCreativeContent(context);
      }

      console.warn(`[LLM] Attempt ${attempt + 1} failed:`, lastError.message);

      // Sleep before retry (except on last attempt)
      if (attempt < CONFIG.maxRetries - 1) {
        await sleep(attempt);
      }
    }
  }

  // All retries exhausted
  console.error(
    `[LLM] All ${CONFIG.maxRetries} attempts failed:`,
    lastError?.message
  );
  return fallbackCreativeContent(context);
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
