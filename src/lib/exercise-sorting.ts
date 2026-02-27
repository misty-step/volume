import { type Id } from "../../convex/_generated/dataModel";
import { type Exercise } from "@/types/domain";
import type { Set } from "@/types/domain";

/**
 * Sort exercises by recent usage.
 * Most recently used exercises first, then alphabetical.
 *
 * @param exercises - Array of exercises to sort
 * @param sets - Array of sets to determine usage
 * @returns Sorted array of exercises (does not mutate input)
 */
export function sortExercisesByRecency(
  exercises: Exercise[] | undefined,
  sets: Set[] | undefined
): Exercise[] {
  if (!exercises) return [];
  if (!sets || sets.length === 0) return exercises;

  // Build map of exerciseId -> last used timestamp
  const lastUsed = new Map<Id<"exercises">, number>();
  sets.forEach((set) => {
    const current = lastUsed.get(set.exerciseId) || 0;
    if (set.performedAt > current) {
      lastUsed.set(set.exerciseId, set.performedAt);
    }
  });

  // Sort: most recently used first, then alphabetical
  return [...exercises].sort((a, b) => {
    const aUsed = lastUsed.get(a._id) || 0;
    const bUsed = lastUsed.get(b._id) || 0;

    if (aUsed !== bUsed) return bUsed - aUsed;
    return a.name.localeCompare(b.name);
  });
}
