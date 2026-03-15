import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { getTodayRangeForTimezoneOffset } from "@/lib/date-utils";
import type { Exercise } from "@/types/domain";
import { normalizeLookup, titleCase } from "./helpers";
import type { CoachToolContext, SetInput } from "./types";

const RECENT_EXERCISE_SET_LIMIT = 120; // Keep tool output small while covering recent trend.

export async function listExercises(
  ctx: CoachToolContext,
  options: { includeDeleted?: boolean } = {}
): Promise<Exercise[]> {
  return (await ctx.convex.query(api.exercises.listExercises, {
    includeDeleted: options.includeDeleted ?? false,
  })) as Exercise[];
}

export async function getTodaySets(ctx: CoachToolContext): Promise<SetInput[]> {
  const { start, end } = getTodayRangeForTimezoneOffset(
    ctx.timezoneOffsetMinutes
  );
  return (await ctx.convex.query(api.sets.listSetsForDateRange, {
    startDate: start,
    endDate: end,
  })) as SetInput[];
}

export async function getRecentExerciseSets(
  ctx: CoachToolContext,
  exerciseId: Id<"exercises">
): Promise<SetInput[]> {
  return (await ctx.convex.query(api.sets.getRecentSetsForExercise, {
    exerciseId,
    limit: RECENT_EXERCISE_SET_LIMIT,
  })) as SetInput[];
}

/**
 * Find exercises whose normalized names contain the query or vice versa.
 * Returns up to `limit` candidates, excluding exact matches (those are handled separately).
 */
export function findCloseMatches(
  exerciseName: string,
  exercises: Exercise[],
  limit = 5
): Exercise[] {
  const normalized = normalizeLookup(exerciseName);
  if (!normalized) return [];

  const MIN_MATCH_LEN = 3;
  return exercises
    .filter((e) => {
      const n = normalizeLookup(e.name);
      if (n === normalized) return false; // skip exact matches
      if (normalized.length < MIN_MATCH_LEN || n.length < MIN_MATCH_LEN)
        return false; // avoid trivial substring matches
      return n.includes(normalized) || normalized.includes(n);
    })
    .slice(0, limit);
}

/**
 * Shared resolution: normalized match then semantic/LLM match.
 * Returns null on no match (never creates).
 */
export async function findExercise(
  ctx: CoachToolContext,
  exerciseName: string,
  exercises: Exercise[]
): Promise<Exercise | null> {
  const normalized = normalizeLookup(exerciseName);
  if (!normalized) return null;
  const exact = exercises.find((e) => normalizeLookup(e.name) === normalized);
  if (exact) return exact;

  if (ctx.resolveExerciseName && exercises.length > 0) {
    try {
      const semantic = await ctx.resolveExerciseName(exerciseName, exercises);
      if (semantic) return semantic;
    } catch {
      // LLM/network failure — fall through to null
    }
  }

  return null;
}

/**
 * Resolve an exercise name to an existing exercise.
 * Does NOT create exercises — use `ensureExercise` for create-on-miss.
 * Returns closeMatches when no match found for disambiguation.
 */
export async function resolveExercise(
  ctx: CoachToolContext,
  exerciseName: string,
  options: { includeDeleted?: boolean } = {}
): Promise<{
  exercise: Exercise | null;
  exercises: Exercise[];
  closeMatches: Exercise[];
}> {
  const exercises = await listExercises(ctx, options);
  const exercise = await findExercise(ctx, exerciseName, exercises);
  const closeMatches = exercise
    ? []
    : findCloseMatches(exerciseName, exercises);
  return { exercise, exercises, closeMatches };
}

export async function ensureExercise(
  ctx: CoachToolContext,
  exerciseName: string
): Promise<{ exercise: Exercise; created: boolean; exercises: Exercise[] }> {
  const exercises = await listExercises(ctx);
  const found = await findExercise(ctx, exerciseName, exercises);
  if (found) return { exercise: found, created: false, exercises };

  const normalizedName = titleCase(exerciseName);

  let createdId: Id<"exercises">;
  try {
    createdId = (await ctx.convex.action(api.exercises.createExercise, {
      name: normalizedName,
    })) as Id<"exercises">;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Convex error";
    throw new Error(
      `Failed to create exercise "${normalizedName}": ${message}`
    );
  }

  const createdExercise = (await ctx.convex.query(api.exercises.getExercise, {
    id: createdId,
  })) as Exercise | null;
  if (createdExercise) {
    return {
      exercise: createdExercise,
      created: true,
      exercises: [...exercises, createdExercise],
    };
  }

  // Should be immediate, but be defensive: if the freshly created exercise can't
  // be fetched (auth or eventual consistency), fall back to a refreshed list.
  const refreshed = await listExercises(ctx);
  const matchedAfterCreate = refreshed.find(
    (exercise) => exercise._id === createdId
  );
  if (matchedAfterCreate) {
    return {
      exercise: matchedAfterCreate,
      created: true,
      exercises: refreshed,
    };
  }

  throw new Error(
    `Created exercise "${normalizedName}" but could not load it afterwards.`
  );

  // unreachable
}
