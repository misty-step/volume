import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { getTodayRangeForTimezoneOffset } from "@/lib/date-utils";
import type { Exercise } from "@/types/domain";
import { normalizeLookup, titleCase } from "./helpers";
import type { CoachToolContext, SetInput } from "./types";

const RECENT_EXERCISE_SET_LIMIT = 120; // Keep tool output small while covering recent trend.

export async function listExercises(
  ctx: CoachToolContext
): Promise<Exercise[]> {
  return (await ctx.convex.query(api.exercises.listExercises, {
    includeDeleted: false,
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
): Promise<{ exercise: Exercise; created: boolean }> {
  const exercises = await listExercises(ctx);
  const matched = findExercise(exercises, exerciseName);
  if (matched) {
    return { exercise: matched, created: false };
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

  return {
    exercise: {
      _id: createdId,
      userId: "",
      name: normalizedName,
      createdAt: Date.now(),
    },
    created: true,
  };
}
