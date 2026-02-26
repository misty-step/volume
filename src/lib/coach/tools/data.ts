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

export function findExercise(
  exercises: Exercise[],
  name: string
): Exercise | null {
  const normalized = normalizeLookup(name);
  const exact = exercises.find(
    (exercise) => normalizeLookup(exercise.name) === normalized
  );
  if (exact) return exact;

  const partial = exercises.find((exercise) => {
    const candidate = normalizeLookup(exercise.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });
  return partial ?? null;
}

export async function ensureExercise(
  ctx: CoachToolContext,
  exerciseName: string
): Promise<{ exercise: Exercise; created: boolean; exercises: Exercise[] }> {
  const exercises = await listExercises(ctx);
  const matched = findExercise(exercises, exerciseName);
  if (matched) {
    return { exercise: matched, created: false, exercises };
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
  const matchedAfterCreate =
    refreshed.find((exercise) => exercise._id === createdId) ??
    findExercise(refreshed, normalizedName);
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
