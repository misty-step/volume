import { summarizeTodaySets } from "@/lib/coach/prototype-analytics";
import type { CoachBlock } from "@/lib/coach/schema";
import { getTodaySets, listExercises } from "./data";
import {
  formatSecondsShort,
  toAnalyticsSetInput,
  uniquePrompts,
} from "./helpers";
import type { CoachToolContext, SetInput, ToolResult } from "./types";

function buildTodaySummaryBlocks(
  sets: SetInput[],
  exerciseNames: Map<string, string>
): CoachBlock[] {
  const summary = summarizeTodaySets(
    sets.map((set) => toAnalyticsSetInput(set)),
    exerciseNames
  );

  if (summary.totalSets === 0) {
    return [
      {
        type: "status",
        tone: "info",
        title: "No sets logged today",
        description: "Log one now and I will generate your daily focus.",
      },
      {
        type: "suggestions",
        prompts: ["10 pushups", "20 squats", "what should I work on today?"],
      },
    ];
  }

  return [
    {
      type: "metrics",
      title: "Today's totals",
      metrics: [
        { label: "Sets", value: String(summary.totalSets) },
        { label: "Reps", value: String(summary.totalReps) },
        {
          label: "Duration",
          value: formatSecondsShort(summary.totalDurationSeconds),
        },
        { label: "Exercises", value: String(summary.topExercises.length) },
      ],
    },
    {
      type: "table",
      title: "Top exercises today",
      rows: summary.topExercises.map((entry) => ({
        label: entry.exerciseName,
        value: `${entry.sets} sets`,
        meta:
          entry.reps > 0
            ? `${entry.reps} reps`
            : entry.durationSeconds > 0
              ? formatSecondsShort(entry.durationSeconds)
              : undefined,
      })),
    },
    {
      type: "suggestions",
      prompts: uniquePrompts([
        "what should I work on today?",
        "show trend for pushups",
        "show trend for squats",
      ]),
    },
  ];
}

export async function runTodaySummaryTool(
  ctx: CoachToolContext
): Promise<ToolResult> {
  const [sets, exercises] = await Promise.all([
    getTodaySets(ctx),
    listExercises(ctx),
  ]);
  const names = new Map<string, string>();
  for (const exercise of exercises) {
    names.set(String(exercise._id), exercise.name);
  }

  const blocks = buildTodaySummaryBlocks(sets, names);
  const summary = summarizeTodaySets(
    sets.map((set) => toAnalyticsSetInput(set)),
    names
  );

  return {
    summary: "Prepared today's summary.",
    blocks,
    outputForModel: {
      status: "ok",
      total_sets: summary.totalSets,
      total_reps: summary.totalReps,
      total_duration_seconds: summary.totalDurationSeconds,
      top_exercises: summary.topExercises.map((entry) => ({
        exercise: entry.exerciseName,
        sets: entry.sets,
      })),
    },
  };
}
