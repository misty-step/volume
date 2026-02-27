import { type Id } from "../../convex/_generated/dataModel";
import { type Exercise, type WeightUnit } from "@/types/domain";
import type { Set } from "@/types/domain";
import { convertWeight, normalizeWeightUnit } from "./weight-utils";
import { computeExerciseMetrics } from "./exercise-metrics";

export interface DailyStats {
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  exercisesWorked: number;
}

export interface ExerciseStats {
  exerciseId: Id<"exercises">;
  name: string;
  sets: number;
  reps: number;
  volume: number;
}

/**
 * Calculate daily statistics from a set of workout sets.
 * Filters to today's sets and aggregates totals.
 * Converts all weights to the target unit for accurate volume calculations.
 *
 * @param sets - Array of sets to analyze
 * @param targetUnit - Unit to convert all weights to (e.g., "lbs" or "kg")
 * @returns Daily statistics or null if no sets
 */
export function calculateDailyStats(
  sets: Set[] | undefined,
  targetUnit: WeightUnit = "lbs"
): DailyStats | null {
  if (!sets || sets.length === 0) return null;

  const today = new Date().toDateString();
  const todaySets = sets.filter(
    (set) => new Date(set.performedAt).toDateString() === today
  );

  if (todaySets.length === 0) return null;

  return {
    totalSets: todaySets.length,
    totalReps: todaySets.reduce((sum, set) => sum + (set.reps || 0), 0),
    totalVolume: todaySets.reduce((sum, set) => {
      if (!set.weight || set.reps === undefined) return sum;
      // Convert weight to target unit before calculating volume
      const setUnit = normalizeWeightUnit(set.unit);
      const convertedWeight = convertWeight(set.weight, setUnit, targetUnit);
      return sum + set.reps * convertedWeight;
    }, 0),
    exercisesWorked: new Set(todaySets.map((s) => s.exerciseId)).size,
  };
}

/**
 * Calculate per-exercise statistics for today's sets.
 * Groups sets by exercise and aggregates totals.
 * Converts all weights to the target unit for accurate volume calculations.
 *
 * @param sets - Array of sets to analyze
 * @param exercises - Array of exercises for name lookup
 * @param targetUnit - Unit to convert all weights to (e.g., "lbs" or "kg")
 * @returns Array of exercise statistics sorted by most sets first
 */
export function calculateDailyStatsByExercise(
  sets: Set[] | undefined,
  exercises: Exercise[] | undefined,
  targetUnit: WeightUnit = "lbs"
): ExerciseStats[] {
  if (!sets || !exercises) return [];

  // Build exercise lookup Map for O(1) access
  const exerciseLookup = new Map(exercises.map((ex) => [ex._id, ex]));

  const today = new Date().toDateString();
  const todaySets = sets.filter(
    (set) => new Date(set.performedAt).toDateString() === today
  );

  if (todaySets.length === 0) return [];

  const setsByExercise = new Map<Id<"exercises">, Set[]>();

  todaySets.forEach((set) => {
    const exercise = exerciseLookup.get(set.exerciseId);
    if (!exercise) return;

    const list = setsByExercise.get(set.exerciseId);
    if (list) {
      list.push(set);
    } else {
      setsByExercise.set(set.exerciseId, [set]);
    }
  });

  const stats = Array.from(setsByExercise.entries()).map(
    ([exerciseId, exerciseSets]) => {
      const exercise = exerciseLookup.get(exerciseId)!;
      const metrics = computeExerciseMetrics(exerciseSets, targetUnit);

      return {
        exerciseId,
        name: exercise.name,
        sets: exerciseSets.length,
        reps: metrics.totalReps,
        volume: metrics.totalVolume,
      };
    }
  );

  return stats.sort((a, b) => {
    if (a.sets !== b.sets) return b.sets - a.sets;
    return a.name.localeCompare(b.name);
  });
}
