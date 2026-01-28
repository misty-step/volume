/**
 * Canonical muscle group definitions.
 *
 * Single source of truth for valid muscle groups across:
 * - AI classification (filtering responses)
 * - Edit dialog (checkbox options)
 * - Mutation validation (data integrity)
 */

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Other",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Set for O(1) membership checks */
export const MUSCLE_GROUP_SET = new Set<string>(MUSCLE_GROUPS);

/**
 * Muscle groups for analytics calculations.
 * Excludes "Other" which is only used for uncategorized exercises.
 */
export const ANALYTICS_MUSCLE_GROUPS = MUSCLE_GROUPS.filter(
  (g): g is Exclude<MuscleGroup, "Other"> => g !== "Other"
);

/**
 * Filters raw strings to valid muscle groups only.
 * Returns ["Other"] if no valid groups found.
 *
 * @example
 * filterValidMuscleGroups(["Quads", "garbage", "Calves"])
 * // => ["Quads", "Calves"]
 *
 * filterValidMuscleGroups(["(and possibly calves)"])
 * // => ["Other"]
 */
export function filterValidMuscleGroups(groups: string[]): MuscleGroup[] {
  const valid = groups.filter((g) => MUSCLE_GROUP_SET.has(g)) as MuscleGroup[];
  return valid.length > 0 ? valid : ["Other"];
}
