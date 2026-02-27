import { type Id } from "../../convex/_generated/dataModel";
import { type WeightUnit } from "@/types/domain";
import type { Set } from "@/types/domain";
import {
  computeExerciseMetrics,
  type ExerciseMetrics,
} from "./exercise-metrics";

export interface ExerciseGroup {
  exerciseId: Id<"exercises">;
  sets: Set[];
  metrics: ExerciseMetrics;
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
        metrics: computeExerciseMetrics([], targetUnit),
        mostRecentSetTime: 0,
      });
    }

    const group = groupsMap.get(set.exerciseId)!;
    group.sets.push(set);

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
    group.metrics = computeExerciseMetrics(group.sets, targetUnit);
  });

  // Sort groups by most recent set time (most recent exercise first)
  return groups.sort((a, b) => b.mostRecentSetTime - a.mostRecentSetTime);
}
