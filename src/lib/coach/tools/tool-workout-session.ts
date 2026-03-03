import { api } from "@/../convex/_generated/api";
import { format } from "date-fns";
import type { Set } from "@/types/domain";
import { getTodayRangeForTimezoneOffset } from "@/lib/date-utils";
import { listExercises } from "./data";
import {
  dateStringToDayRangeMs,
  describeSetSummary,
  formatSecondsShort,
} from "./helpers";
import { WorkoutSessionArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

/**
 * Parse an optional YYYY-MM-DD string to start/end timestamps for a calendar
 * day in the user's timezone. Falls back to today when date is not provided.
 */
function getSessionRange(
  dateStr: string | undefined,
  offsetMinutes: number
): { start: number; end: number; label: string } | null {
  if (!dateStr) {
    const range = getTodayRangeForTimezoneOffset(offsetMinutes);
    return { ...range, label: "Today" };
  }

  const range = dateStringToDayRangeMs(dateStr, offsetMinutes);
  if (!range) return null;
  return { ...range, label: dateStr };
}

function formatTime(ms: number, offsetMinutes: number): string {
  return format(new Date(ms - offsetMinutes * 60_000), "h:mm a");
}

export async function runWorkoutSessionTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = WorkoutSessionArgsSchema.parse(rawArgs);
  const offset = ctx.timezoneOffsetMinutes ?? 0;

  const sessionRange = getSessionRange(args.date, offset);
  if (!sessionRange) {
    return {
      summary: "Invalid date format.",
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Invalid date format",
          description: "Use a valid calendar date in YYYY-MM-DD format.",
        },
      ],
      outputForModel: { status: "error", error: "invalid_date_format" },
    };
  }

  const { start, end, label } = sessionRange;

  const [allSets, exercises] = await Promise.all([
    ctx.convex.query(api.sets.listSetsForDateRange, {
      startDate: start,
      endDate: end,
    }),
    listExercises(ctx, { includeDeleted: true }),
  ]);

  const sets = allSets as Set[];
  const exerciseMap = new Map(exercises.map((e) => [String(e._id), e]));

  if (sets.length === 0) {
    return {
      summary: `No sets logged on ${label}.`,
      blocks: [
        {
          type: "status",
          tone: "info",
          title: `No workout on ${label}`,
          description: `No sets were logged on ${label}.`,
        },
      ],
      outputForModel: {
        status: "ok",
        date: label,
        total_sets: 0,
        total_reps: 0,
        total_duration_seconds: 0,
        exercise_count: 0,
        set_ids: [],
      },
    };
  }

  const totalReps = sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalDuration = sets.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  // Count sets per exercise
  const exerciseCounts = new Map<string, number>();
  for (const set of sets) {
    const key = String(set.exerciseId);
    exerciseCounts.set(key, (exerciseCounts.get(key) ?? 0) + 1);
  }

  return {
    summary: `${label}: ${sets.length} sets, ${totalReps} reps.`,
    blocks: [
      {
        type: "metrics",
        title: `${label}'s workout`,
        metrics: [
          { label: "Sets", value: String(sets.length) },
          { label: "Reps", value: String(totalReps) },
          { label: "Duration", value: formatSecondsShort(totalDuration) },
          { label: "Exercises", value: String(exerciseCounts.size) },
        ],
      },
      {
        type: "entity_list",
        title: "Sets logged",
        items: sets.map((set) => {
          const ex = exerciseMap.get(String(set.exerciseId));
          return {
            id: String(set._id),
            title: ex?.name ?? "Unknown exercise",
            subtitle: `${describeSetSummary(set, ctx.defaultUnit)} · ${formatTime(set.performedAt, offset)}`,
            meta: `set_id=${String(set._id)}`,
            prompt: `delete set ${String(set._id)}`,
          };
        }),
      },
    ],
    outputForModel: {
      status: "ok",
      date: label,
      total_sets: sets.length,
      total_reps: totalReps,
      total_duration_seconds: totalDuration,
      exercise_count: exerciseCounts.size,
      set_ids: sets.map((s) => String(s._id)),
    },
  };
}
