/**
 * PR (Personal Record) Detection
 *
 * Detects when a user achieves a new personal record for an exercise.
 * PRs can be for max weight, max reps, or max volume in a single set.
 */

import { Set } from "@/types/domain";

/**
 * Type of PR achieved
 * - 'weight': Heaviest weight lifted for this exercise
 * - 'reps': Most reps completed for this exercise
 * - 'volume': Highest volume (weight × reps) for this exercise
 */
export type PRType = "weight" | "reps" | "volume";

export interface PRResult {
  type: PRType;
  currentValue: number;
  previousValue: number;
}

/**
 * Check if a set represents a new personal record
 *
 * Compares the current set against all previous sets for the same exercise
 * to determine if it's a PR for weight, reps, or volume.
 *
 * @param currentSet - The set to check for PR
 * @param previousSets - All previous sets for the same exercise (excluding current)
 * @returns PRResult if a PR was achieved, null otherwise
 *
 * @example
 * ```typescript
 * const currentSet = { reps: 12, weight: 315, exerciseId: "..." };
 * const previousSets = [
 *   { reps: 10, weight: 315, exerciseId: "..." },
 *   { reps: 8, weight: 320, exerciseId: "..." }
 * ];
 * const pr = checkForPR(currentSet, previousSets);
 * // Returns: { type: 'reps', currentValue: 12, previousValue: 10 }
 * ```
 */
export function checkForPR(
  currentSet: Set,
  previousSets: Set[]
): PRResult | null {
  // PR detection only works for rep-based exercises currently
  if (currentSet.reps === undefined) {
    return null;
  }

  // No previous sets = first set for this exercise = always a PR
  if (previousSets.length === 0) {
    const currentVolume = (currentSet.weight || 0) * currentSet.reps;

    // Determine which type of PR to celebrate for first set
    if (currentSet.weight && currentSet.weight > 0) {
      return {
        type: "weight",
        currentValue: currentSet.weight,
        previousValue: 0,
      };
    }
    if (currentSet.reps > 0) {
      return {
        type: "reps",
        currentValue: currentSet.reps,
        previousValue: 0,
      };
    }
    if (currentVolume > 0) {
      return {
        type: "volume",
        currentValue: currentVolume,
        previousValue: 0,
      };
    }
  }

  // Calculate current set metrics
  const currentWeight = currentSet.weight || 0;
  const currentReps = currentSet.reps;
  const currentVolume = currentWeight * currentReps;

  // Find max values from previous sets (only rep-based sets)
  const repBasedSets = previousSets.filter((s) => s.reps !== undefined);
  if (repBasedSets.length === 0) {
    // Treat as first rep-based set if no previous rep-based sets exist
    const currentVolume = currentWeight * currentReps;
    if (currentWeight > 0) {
      return { type: "weight", currentValue: currentWeight, previousValue: 0 };
    }
    if (currentReps > 0) {
      return { type: "reps", currentValue: currentReps, previousValue: 0 };
    }
    if (currentVolume > 0) {
      return { type: "volume", currentValue: currentVolume, previousValue: 0 };
    }
    return null;
  }

  const maxPreviousWeight = Math.max(...repBasedSets.map((s) => s.weight || 0));
  const maxPreviousReps = Math.max(...repBasedSets.map((s) => s.reps!));
  const maxPreviousVolume = Math.max(
    ...repBasedSets.map((s) => (s.weight || 0) * s.reps!)
  );

  // Check for PRs (prioritize: weight > volume > reps)
  // Weight PR is most impressive for strength training
  if (currentWeight > 0 && currentWeight > maxPreviousWeight) {
    return {
      type: "weight",
      currentValue: currentWeight,
      previousValue: maxPreviousWeight,
    };
  }

  // Volume PR (weight × reps) - good indicator of overall work
  if (currentVolume > 0 && currentVolume > maxPreviousVolume) {
    return {
      type: "volume",
      currentValue: currentVolume,
      previousValue: maxPreviousVolume,
    };
  }

  // Reps PR - endurance/conditioning milestone
  if (currentReps > maxPreviousReps) {
    return {
      type: "reps",
      currentValue: currentReps,
      previousValue: maxPreviousReps,
    };
  }

  // No PR achieved
  return null;
}

/**
 * Format PR message for display
 *
 * @param exerciseName - Name of the exercise
 * @param prResult - The PR result
 * @param unit - Weight unit (lbs or kg)
 * @returns Formatted message string
 *
 * @example
 * ```typescript
 * formatPRMessage("Squats", { type: 'weight', currentValue: 315, previousValue: 300 }, "lbs")
 * // Returns: "🎉 NEW PR! Squats: 315 lbs (previous: 300 lbs)"
 * ```
 */
export function formatPRMessage(
  exerciseName: string,
  prResult: PRResult,
  unit: string = "lbs"
): string {
  const { type, currentValue, previousValue } = prResult;

  switch (type) {
    case "weight":
      return `🎉 NEW PR! ${exerciseName}: ${currentValue} ${unit} (previous: ${previousValue} ${unit})`;

    case "volume":
      return `🎉 NEW PR! ${exerciseName}: ${currentValue} ${unit} total volume (previous: ${previousValue} ${unit})`;

    case "reps":
      return `🎉 NEW PR! ${exerciseName}: ${currentValue} reps (previous: ${previousValue} reps)`;
  }
}
