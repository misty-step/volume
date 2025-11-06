import { Id } from "../../convex/_generated/dataModel";
import { WeightUnit } from "@/types/domain";
import type { Set } from "@/types/domain";
import { convertWeight, normalizeWeightUnit } from "./weight-utils";

export interface ExerciseGroup {
  exerciseId: Id<"exercises">;
  sets: Set[];
  totalVolume: number;
  totalReps: number;
  mostRecentSetTime: number;
}

/**
 * Group sets by exercise for a workout session view.
 * Shows which exercises were performed and aggregates their totals.
 * Sorted by most recently performed (last set in each exercise group).
 *
 * @param sets - Array of sets to group (typically today's sets)
 * @param targetUnit - Unit to convert all weights to for volume calculation
 * @returns Array of exercise groups sorted by most recent activity
 */
export function groupSetsByExercise(
  sets: Set[] | undefined,
  targetUnit: WeightUnit = "lbs"
): ExerciseGroup[] {
  if (!sets || sets.length === 0) return [];

  // Group sets by exercise
  const groupsMap = new Map<Id<"exercises">, ExerciseGroup>();

  sets.forEach((set) => {
    // Skip malformed sets without an exerciseId
    if (!set.exerciseId) return;

    if (!groupsMap.has(set.exerciseId)) {
      groupsMap.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        sets: [],
        totalVolume: 0,
        totalReps: 0,
        mostRecentSetTime: 0,
      });
    }

    const group = groupsMap.get(set.exerciseId)!;
    group.sets.push(set);

    // Only count reps and volume for rep-based exercises
    if (set.reps !== undefined) {
      group.totalReps += set.reps;

      // Calculate volume with unit conversion (only for rep-based sets with weight)
      if (set.weight) {
        const setUnit = normalizeWeightUnit(set.unit);
        const convertedWeight = convertWeight(set.weight, setUnit, targetUnit);
        group.totalVolume += set.reps * convertedWeight;
      }
    }

    // Track most recent set time for sorting
    if (set.performedAt > group.mostRecentSetTime) {
      group.mostRecentSetTime = set.performedAt;
    }
  });

  // Convert to array and sort by most recently performed
  const groups = Array.from(groupsMap.values());

  groups.forEach((group) => {
    // Sort sets within each group newest first
    group.sets.sort((a, b) => b.performedAt - a.performedAt);
  });

  // Sort groups by most recent set time (most recent exercise first)
  return groups.sort((a, b) => b.mostRecentSetTime - a.mostRecentSetTime);
}
