/**
 * Exercise Classification
 *
 * Classifies exercises into muscle groups using LLM or pattern matching fallback.
 * Extracted from openai.ts to separate classification from report generation.
 *
 * @module ai/classify
 */

import { filterValidMuscleGroups } from "../lib/muscleGroups";
import {
  createOpenRouterClient,
  MODELS,
  isConfigured,
} from "../lib/openrouter";

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
 * Classify exercise into muscle groups using MiniMax M2.5 via OpenRouter
 *
 * Uses a low-latency, tool-capable model for simple classification tasks.
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
