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
 * Resolve an exercise name to an existing exercise using:
 * 1. Exact normalized match (free)
 * 2. Semantic/LLM match via ctx.resolveExerciseName (when available)
 *
 * Does NOT create exercises — use `ensureExercise` for create-on-miss.
 */
export async function resolveExercise(
  ctx: CoachToolContext,
  exerciseName: string,
  options: { includeDeleted?: boolean } = {}
): Promise<{ exercise: Exercise | null; exercises: Exercise[] }> {
  const exercises = await listExercises(ctx, options);
  const normalized = normalizeLookup(exerciseName);
  const exact = exercises.find((e) => normalizeLookup(e.name) === normalized);
  if (exact) return { exercise: exact, exercises };

  if (ctx.resolveExerciseName && exercises.length > 0) {
    const semantic = await ctx.resolveExerciseName(exerciseName, exercises);
    if (semantic) return { exercise: semantic, exercises };
  }

  return { exercise: null, exercises };
}

export async function ensureExercise(
  ctx: CoachToolContext,
  exerciseName: string
): Promise<{ exercise: Exercise; created: boolean; exercises: Exercise[] }> {
  const exercises = await listExercises(ctx);

  // 1. Exact match (normalized) — free, no LLM call
  const normalized = normalizeLookup(exerciseName);
  const exact = exercises.find((e) => normalizeLookup(e.name) === normalized);
  if (exact) return { exercise: exact, created: false, exercises };

  // 2. Semantic match — LLM picks from candidate list
  if (ctx.resolveExerciseName && exercises.length > 0) {
    const semantic = await ctx.resolveExerciseName(exerciseName, exercises);
    if (semantic) return { exercise: semantic, created: false, exercises };
  }

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
