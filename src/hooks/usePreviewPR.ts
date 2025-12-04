/**
 * usePreviewPR Hook - Real-time PR detection as user types
 *
 * Provides instant feedback when user's current input would result in a Personal Record.
 * Creates excitement and motivation before submission.
 *
 * Strategy:
 * - Compare current form values against historical best for exercise
 * - More weight at same/more reps = PR
 * - Same weight with more reps = PR
 * - Longer duration = PR
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface PRPreview {
  /**
   * Whether current values would be a PR
   */
  isPR: boolean;

  /**
   * Type of PR if applicable
   * - "weight": Higher weight than ever before
   * - "reps": More reps at same weight
   * - "volume": More total volume (weight × reps)
   * - "duration": Longer duration
   */
  prType?: "weight" | "reps" | "volume" | "duration";

  /**
   * Delta from historical best
   * Examples:
   * - "+5 lbs" (weight PR)
   * - "+2 reps" (rep PR)
   * - "+10 lbs total" (volume PR)
   * - "+5s" (duration PR)
   */
  delta?: string;

  /**
   * Historical best for comparison
   */
  historicalBest?: {
    reps?: number;
    weight?: number;
    duration?: number;
  };
}

interface UsePreviewPRParams {
  exerciseId: Id<"exercises"> | string | null;
  currentReps?: number;
  currentWeight?: number;
  currentDuration?: number;
  unit: "lbs" | "kg";
}

/**
 * Hook to preview PR status in real-time as user types
 *
 * @param exerciseId - Selected exercise ID
 * @param currentReps - Current reps input value
 * @param currentWeight - Current weight input value
 * @param currentDuration - Current duration input value
 * @param unit - Weight unit for delta display
 * @returns PR preview with type and delta
 *
 * @example
 * const { isPR, prType, delta } = usePreviewPR({
 *   exerciseId: "exercise123",
 *   currentReps: 12,
 *   currentWeight: 140,
 *   unit: "lbs"
 * });
 * // → { isPR: true, prType: "weight", delta: "+5 lbs" }
 */
export function usePreviewPR({
  exerciseId,
  currentReps,
  currentWeight,
  currentDuration,
  unit,
}: UsePreviewPRParams): PRPreview {
  // Fetch all sets for this exercise to find historical best
  const allSets = useQuery(
    api.sets.listSets,
    exerciseId ? { exerciseId: exerciseId as Id<"exercises"> } : "skip"
  );

  // Calculate PR preview
  const preview = useMemo((): PRPreview => {
    // No exercise or no sets = no PR possible
    if (!exerciseId || !allSets || allSets.length === 0) {
      return { isPR: false };
    }

    // No current values = no PR to preview
    const hasCurrentValues =
      currentReps !== undefined ||
      currentWeight !== undefined ||
      currentDuration !== undefined;

    if (!hasCurrentValues) {
      return { isPR: false };
    }

    // Find historical best for this exercise
    const historicalBest = findHistoricalBest(allSets);

    if (!historicalBest) {
      // First set ever = always a PR!
      return {
        isPR: true,
        prType: currentDuration !== undefined ? "duration" : "weight",
        delta: "First time!",
        historicalBest: undefined,
      };
    }

    // Duration-based PR check
    if (
      currentDuration !== undefined &&
      historicalBest.duration !== undefined
    ) {
      if (currentDuration > historicalBest.duration) {
        const deltaSeconds = currentDuration - historicalBest.duration;
        return {
          isPR: true,
          prType: "duration",
          delta: `+${deltaSeconds}s`,
          historicalBest,
        };
      }
      return { isPR: false, historicalBest };
    }

    // Rep-based PR check
    if (currentReps !== undefined && historicalBest.reps !== undefined) {
      const currentWeightValue = currentWeight ?? 0;
      const historicalWeightValue = historicalBest.weight ?? 0;

      // Weight PR: Higher weight than ever before
      if (currentWeightValue > historicalWeightValue) {
        const deltaWeight = currentWeightValue - historicalWeightValue;
        return {
          isPR: true,
          prType: "weight",
          delta: `+${deltaWeight} ${unit}`,
          historicalBest,
        };
      }

      // Rep PR: More reps at same weight
      if (
        currentWeightValue === historicalWeightValue &&
        currentReps > historicalBest.reps
      ) {
        const deltaReps = currentReps - historicalBest.reps;
        return {
          isPR: true,
          prType: "reps",
          delta: `+${deltaReps} reps`,
          historicalBest,
        };
      }

      // Volume PR: Same/fewer reps but more total volume
      const currentVolume = currentWeightValue * currentReps;
      const historicalVolume = historicalWeightValue * historicalBest.reps;

      if (currentVolume > historicalVolume) {
        const deltaVolume = currentVolume - historicalVolume;
        return {
          isPR: true,
          prType: "volume",
          delta: `+${deltaVolume} ${unit} total`,
          historicalBest,
        };
      }
    }

    // Not a PR
    return { isPR: false, historicalBest };
  }, [exerciseId, allSets, currentReps, currentWeight, currentDuration, unit]);

  return preview;
}

/**
 * Find the historical best set for an exercise
 *
 * Best is determined by:
 * 1. Highest weight (primary)
 * 2. Most reps at that weight (secondary)
 * 3. Longest duration (for duration-based)
 */
function findHistoricalBest(
  sets: Array<{
    reps?: number;
    weight?: number;
    duration?: number;
  }>
): { reps?: number; weight?: number; duration?: number } | null {
  if (sets.length === 0) return null;

  // Check if duration-based or rep-based
  const firstSet = sets[0];
  const isDurationBased = firstSet?.duration !== undefined;

  if (isDurationBased) {
    // Find longest duration
    const best = sets.reduce(
      (max, set) => {
        if (!set.duration) return max;
        if (!max.duration || set.duration > max.duration) {
          return { duration: set.duration };
        }
        return max;
      },
      {} as { duration?: number }
    );

    return best.duration !== undefined ? best : null;
  }

  // Rep-based: Find highest weight, then most reps at that weight
  const best = sets.reduce(
    (max, set) => {
      if (!set.reps) return max;

      const setWeight = set.weight ?? 0;
      const maxWeight = max.weight ?? 0;

      // Higher weight wins
      if (setWeight > maxWeight) {
        return { reps: set.reps, weight: set.weight };
      }

      // Same weight, more reps wins
      if (setWeight === maxWeight && set.reps > (max.reps ?? 0)) {
        return { reps: set.reps, weight: set.weight };
      }

      return max;
    },
    {} as { reps?: number; weight?: number }
  );

  return best.reps !== undefined ? best : null;
}
