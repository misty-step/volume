import { api } from "@/../convex/_generated/api";
import { format } from "date-fns";
import type { Set } from "@/types/domain";
import { listExercises } from "./data";
import { formatSecondsShort } from "./helpers";
import { DateRangeSetsArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

/**
 * Convert a YYYY-MM-DD string to start-of-day UTC timestamp
 * using the user's timezone offset.
 *
 * The offset convention (positive = behind UTC, e.g. America/Chicago ~ 360)
 * matches getTodayRangeForTimezoneOffset.
 */
function dateStringToStartMs(dateStr: string, offsetMinutes: number): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Build midnight in the user's local time as a UTC timestamp
  const offsetMs = offsetMinutes * 60 * 1000;
  return Date.UTC(year!, month! - 1, day!, 0, 0, 0, 0) + offsetMs;
}

function dateStringToEndMs(dateStr: string, offsetMinutes: number): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const offsetMs = offsetMinutes * 60 * 1000;
  return Date.UTC(year!, month! - 1, day!, 23, 59, 59, 999) + offsetMs;
}

function describeSet(set: Set, defaultUnit: "lbs" | "kg"): string {
  if (set.duration !== undefined) return formatSecondsShort(set.duration);
  const reps = set.reps ?? 0;
  if (set.weight === undefined) return `${reps} reps`;
  return `${reps} reps @ ${set.weight} ${set.unit ?? defaultUnit}`;
}

function utcDayKey(ms: number, offsetMinutes: number): string {
  const localMs = ms - offsetMinutes * 60_000;
  return format(new Date(localMs), "yyyy-MM-dd");
}

export async function runDateRangeSetsTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = DateRangeSetsArgsSchema.parse(rawArgs);
  const offset = ctx.timezoneOffsetMinutes ?? 0;

  const startDate = dateStringToStartMs(args.start_date, offset);
  const endDate = dateStringToEndMs(args.end_date, offset);

  if (startDate > endDate) {
    return {
      summary: "Invalid date range.",
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Invalid date range",
          description: "start_date must be on or before end_date.",
        },
      ],
      outputForModel: { status: "error", error: "invalid_date_range" },
    };
  }

  const [allSets, exercises] = await Promise.all([
    ctx.convex.query(api.sets.listSetsForDateRange, { startDate, endDate }),
    listExercises(ctx, { includeDeleted: true }),
  ]);

  const sets = allSets as Set[];
  const exerciseMap = new Map(exercises.map((e) => [String(e._id), e]));

  // Group sets by local date key
  const grouped = new Map<string, Set[]>();
  for (const set of sets) {
    const key = utcDayKey(set.performedAt, offset);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(set);
  }

  // Sort days descending
  const days = [...grouped.keys()].sort((a, b) => (a < b ? 1 : -1));

  const outputDays = days.map((day) => {
    const daySets = grouped.get(day)!;
    return {
      date: day,
      set_count: daySets.length,
      set_ids: daySets.map((s) => String(s._id)),
    };
  });

  return {
    summary: `Found ${sets.length} sets across ${days.length} day${days.length === 1 ? "" : "s"}.`,
    blocks: [
      {
        type: "entity_list",
        title: `Sets from ${args.start_date} to ${args.end_date}`,
        description: `${sets.length} set${sets.length === 1 ? "" : "s"} across ${days.length} day${days.length === 1 ? "" : "s"}`,
        emptyLabel: "No sets found in this date range.",
        items: days.map((day) => {
          const daySets = grouped.get(day)!;
          const lines = daySets.map((set) => {
            const ex = exerciseMap.get(String(set.exerciseId));
            return `${ex?.name ?? "Unknown"}: ${describeSet(set, ctx.defaultUnit)}`;
          });
          return {
            id: day,
            title: day,
            subtitle: `${daySets.length} set${daySets.length === 1 ? "" : "s"}`,
            meta: lines.slice(0, 3).join(" · "),
          };
        }),
      },
    ],
    outputForModel: {
      status: "ok",
      total_sets: sets.length,
      days_count: days.length,
      days: outputDays,
    },
  };
}
