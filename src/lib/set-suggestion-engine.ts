/**
 * Set Suggestion Engine - Deep Module for Progressive Overload Logic
 *
 * Design Philosophy (Ousterhout):
 * - Simple Interface: Single function `suggestNextSet(lastSet)` → returns suggestion
 * - Complex Implementation: Encapsulates double progression, PR detection, and reasoning
 * - Information Hiding: Progressive overload strategy hidden from UI components
 *
 * Progressive Overload Strategy (Double Progression):
 * 1. If reps < target (e.g., 12 reps) → suggest +1 rep (build endurance first)
 * 2. If reps >= target → suggest +5 lbs (increase load once rep target hit)
 * 3. If weight 0 (bodyweight) → suggest +1 rep only
 *
 * Based on research from Strong, JEFIT, and strength training principles.
 */

import { Set } from "@/types/domain";

/**
 * Configuration for progressive overload suggestions
 */
const SUGGESTION_CONFIG = {
  // Target reps before increasing weight (double progression)
  targetReps: 12,

  // Weight increment for lb-based suggestions (5 lbs is standard)
  weightIncrementLbs: 5,

  // Weight increment for kg-based suggestions (2.5 kg is standard)
  weightIncrementKg: 2.5,

  // Minimum reps to suggest (safety floor)
  minReps: 1,

  // Maximum reps to suggest (avoid fatigue rep ranges)
  maxReps: 20,
} as const;

export interface SetSuggestion {
  /**
   * Suggested reps for next set
   */
  reps?: number;

  /**
   * Suggested weight for next set (undefined for duration-based exercises)
   */
  weight?: number;

  /**
   * Suggested duration for next set (undefined for rep-based exercises)
   */
  duration?: number;

  /**
   * Human-readable reasoning for the suggestion
   * Examples:
   * - "Try +1 rep to build endurance"
   * - "Time to add weight! (+5 lbs)"
   * - "Try +5 seconds for longer hold"
   */
  reasoning: string;

  /**
   * Strategy used for suggestion
   * - "increase-reps": Building endurance (double progression step 1)
   * - "increase-weight": Adding load (double progression step 2)
   * - "increase-duration": Extending hold time
   * - "maintain": Keep same numbers (no progression opportunity)
   */
  strategy:
    | "increase-reps"
    | "increase-weight"
    | "increase-duration"
    | "maintain";

  /**
   * Whether this suggestion represents a potential Personal Record
   */
  isPotentialPR: boolean;
}

/**
 * Generate next-set suggestion based on last set performance
 *
 * This is the ONLY public interface to the suggestion engine.
 * All progressive overload logic is encapsulated here.
 *
 * @param lastSet - Most recent set for the exercise
 * @param unit - Weight unit ("lbs" or "kg") for weight increments
 * @returns Suggestion object with next set targets and reasoning
 *
 * @example
 * // Reps below target - suggest adding reps
 * const suggestion = suggestNextSet({reps: 10, weight: 135}, "lbs");
 * // → {reps: 11, weight: 135, reasoning: "Try +1 rep..."}
 *
 * @example
 * // Reps at target - suggest adding weight
 * const suggestion = suggestNextSet({reps: 12, weight: 135}, "lbs");
 * // → {reps: 12, weight: 140, reasoning: "Time to add weight!..."}
 */
export function suggestNextSet(
  lastSet: Set | null,
  unit: "lbs" | "kg" = "lbs"
): SetSuggestion | null {
  // No last set - no suggestion
  if (!lastSet) {
    return null;
  }

  // Duration-based exercise (planks, holds)
  if (lastSet.duration !== undefined) {
    return suggestDurationProgression(lastSet);
  }

  // Rep-based exercise (most common case)
  if (lastSet.reps !== undefined) {
    return suggestRepProgression(lastSet, unit);
  }

  // Should never reach here (every set has reps or duration)
  return null;
}

/**
 * Suggest progression for duration-based exercises (planks, wall sits, etc.)
 *
 * Strategy: Add 5 seconds to previous duration (gradual progression)
 */
function suggestDurationProgression(lastSet: Set): SetSuggestion {
  const currentDuration = lastSet.duration ?? 0;
  const suggestedDuration = currentDuration + 5; // +5 seconds

  return {
    duration: suggestedDuration,
    reasoning: `Try +5 seconds for longer hold`,
    strategy: "increase-duration",
    isPotentialPR: suggestedDuration > currentDuration,
  };
}

/**
 * Suggest progression for rep-based exercises (double progression)
 *
 * Logic:
 * 1. If bodyweight (weight=0) → always increase reps
 * 2. If reps < target → increase reps by 1
 * 3. If reps >= target → increase weight, reset to target-2 reps
 * 4. If reps at max → maintain (avoid fatigue zone)
 */
function suggestRepProgression(
  lastSet: Set,
  unit: "lbs" | "kg"
): SetSuggestion {
  const currentReps = lastSet.reps ?? 0;
  const currentWeight = lastSet.weight ?? 0;
  const isBodyweight = currentWeight === 0;

  // Get weight increment based on unit
  const weightIncrement =
    unit === "kg"
      ? SUGGESTION_CONFIG.weightIncrementKg
      : SUGGESTION_CONFIG.weightIncrementLbs;

  // Bodyweight exercises - always increase reps
  if (isBodyweight) {
    const suggestedReps = Math.min(currentReps + 1, SUGGESTION_CONFIG.maxReps);

    if (suggestedReps === currentReps) {
      // Hit max reps - maintain
      return {
        reps: currentReps,
        reasoning: `Great work! Maintain ${currentReps} reps`,
        strategy: "maintain",
        isPotentialPR: false,
      };
    }

    return {
      reps: suggestedReps,
      reasoning: `Try +1 rep to build endurance`,
      strategy: "increase-reps",
      isPotentialPR: true,
    };
  }

  // Weighted exercises - double progression

  // Case 1: Reps below target - increase reps (build endurance)
  if (currentReps < SUGGESTION_CONFIG.targetReps) {
    const suggestedReps = Math.min(
      currentReps + 1,
      SUGGESTION_CONFIG.targetReps
    );

    return {
      reps: suggestedReps,
      weight: currentWeight,
      reasoning: `Try +1 rep to build endurance (target: ${SUGGESTION_CONFIG.targetReps})`,
      strategy: "increase-reps",
      isPotentialPR: suggestedReps > currentReps,
    };
  }

  // Case 2: Reps at/above target - increase weight (add load)
  if (currentReps >= SUGGESTION_CONFIG.targetReps) {
    const suggestedWeight = currentWeight + weightIncrement;
    const suggestedReps = SUGGESTION_CONFIG.targetReps - 2; // Reset to target-2 for new weight

    return {
      reps: suggestedReps,
      weight: suggestedWeight,
      reasoning: `Time to add weight! (+${weightIncrement} ${unit})`,
      strategy: "increase-weight",
      isPotentialPR: true,
    };
  }

  // Fallback (should never reach)
  return {
    reps: currentReps,
    weight: currentWeight,
    reasoning: `Repeat previous set`,
    strategy: "maintain",
    isPotentialPR: false,
  };
}

/**
 * Check if suggested set would be a Personal Record
 *
 * A PR occurs when:
 * - More reps at same weight, OR
 * - Same/more reps at higher weight
 *
 * This is used by the PR Preview Badge (Phase 1.3)
 */
export function wouldBePR(
  suggestion: SetSuggestion,
  historicalBest: Set | null
): boolean {
  if (!historicalBest || !suggestion.isPotentialPR) {
    return false;
  }

  // Duration-based PR
  if (
    suggestion.duration !== undefined &&
    historicalBest.duration !== undefined
  ) {
    return suggestion.duration > historicalBest.duration;
  }

  // Rep-based PR (most common)
  if (suggestion.reps !== undefined && historicalBest.reps !== undefined) {
    const suggestionWeight = suggestion.weight ?? 0;
    const historicalWeight = historicalBest.weight ?? 0;

    // More weight = PR
    if (suggestionWeight > historicalWeight) {
      return true;
    }

    // Same weight, more reps = PR
    if (
      suggestionWeight === historicalWeight &&
      suggestion.reps > historicalBest.reps
    ) {
      return true;
    }
  }

  return false;
}
