/**
 * PR (Personal Record) Detection for Convex
 *
 * Detects when a set represents a new personal record for an exercise.
 * PRs can be for max weight, max reps, or max volume in a single set.
 */

export type PRType = "weight" | "reps" | "volume";

export interface PRResult {
  type: PRType;
  currentValue: number;
  previousValue: number;
}

interface SetData {
  reps: number;
  weight?: number;
  performedAt: number;
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
 */
export function checkForPR(
  currentSet: SetData,
  previousSets: SetData[]
): PRResult | null {
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

  // Find max values from previous sets
  const maxPreviousWeight = Math.max(...previousSets.map((s) => s.weight || 0));
  const maxPreviousReps = Math.max(...previousSets.map((s) => s.reps));
  const maxPreviousVolume = Math.max(
    ...previousSets.map((s) => (s.weight || 0) * s.reps)
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
