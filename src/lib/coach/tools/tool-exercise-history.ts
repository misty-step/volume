import { format } from "date-fns";
import type { Set } from "@/types/domain";
import { resolveExercise, getRecentExerciseSets } from "./data";
import { exerciseNotFoundResult, formatSecondsShort } from "./helpers";
import { ExerciseHistoryArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

function formatSetLine(set: Set, defaultUnit: "lbs" | "kg"): string {
  if (set.duration !== undefined) {
    return formatSecondsShort(set.duration);
  }
  const reps = set.reps ?? 0;
  if (set.weight === undefined) {
    return `${reps} reps`;
  }
  return `${reps} reps @ ${set.weight} ${set.unit ?? defaultUnit}`;
}

function formatDate(ms: number, offsetMinutes: number): string {
  return format(new Date(ms - offsetMinutes * 60_000), "MMM d, yyyy");
}

export async function runExerciseHistoryTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = ExerciseHistoryArgsSchema.parse(rawArgs);
  const limit = args.limit ?? 20;

  const { exercise, closeMatches } = await resolveExercise(
    ctx,
    args.exercise_name,
    { includeDeleted: true }
  );
  if (!exercise) {
    return exerciseNotFoundResult(
      args.exercise_name,
      "exercise_not_found",
      "I couldn't find that exercise in your library.",
      closeMatches.map((e) => e.name)
    );
  }

  const allSets = (await getRecentExerciseSets(ctx, exercise._id)) as Set[];
  const sets = allSets.slice(0, limit);

  if (sets.length === 0) {
    return {
      summary: `No history for ${exercise.name}.`,
      blocks: [
        {
          type: "entity_list",
          title: `${exercise.name} history`,
          emptyLabel: "No sets logged for this exercise yet.",
          items: [],
        },
      ],
      outputForModel: {
        status: "ok",
        exercise_name: exercise.name,
        sets_found: 0,
        set_ids: [],
      },
    };
  }

  const offset = ctx.timezoneOffsetMinutes ?? 0;

  return {
    summary: `Loaded ${sets.length} recent sets for ${exercise.name}.`,
    blocks: [
      {
        type: "entity_list",
        title: `${exercise.name} history`,
        description: `Last ${sets.length} set${sets.length === 1 ? "" : "s"}`,
        items: sets.map((set) => ({
          id: String(set._id),
          title: formatSetLine(set, ctx.defaultUnit),
          subtitle: formatDate(set.performedAt, offset),
          meta: `set_id=${String(set._id)}`,
          prompt: `delete set ${String(set._id)}`,
        })),
      },
    ],
    outputForModel: {
      status: "ok",
      exercise_name: exercise.name,
      sets_found: sets.length,
      set_ids: sets.map((s) => String(s._id)),
    },
  };
}
