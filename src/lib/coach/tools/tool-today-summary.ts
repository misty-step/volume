import type { TodayTotalsSummary } from "@/lib/coach/prototype-analytics";
import type { CoachBlock } from "@/lib/coach/schema";
import { buildTodayTotals } from "./data";
import { formatSecondsShort, toTodayTotalsOutput } from "./helpers";
import type { CoachToolContext, ToolResult } from "./types";

function buildTodaySummaryBlocks(summary: TodayTotalsSummary): CoachBlock[] {
  if (summary.totalSets === 0) {
    return [
      {
        type: "status",
        tone: "info",
        title: "No sets logged today",
        description: "Log one now and I will generate your daily focus.",
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
        { label: "Exercises", value: String(summary.exerciseCount) },
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
  ];
}

function buildTodaySummaryOutput(summary: TodayTotalsSummary) {
  if (summary.totalSets === 0) {
    return {
      status: "ok",
      surface: "today_empty",
      title: "No sets logged today",
      description: "Log one now and I will generate your daily focus.",
      ...toTodayTotalsOutput(summary),
      total_duration_seconds: summary.totalDurationSeconds,
      top_exercises: [],
    };
  }

  return {
    status: "ok",
    surface: "today_summary",
    title: "Today's totals",
    top_exercises_title: "Top exercises today",
    ...toTodayTotalsOutput(summary),
    total_duration_seconds: summary.totalDurationSeconds,
    top_exercises: summary.topExercises.map((entry) => ({
      exercise_name: entry.exerciseName,
      sets: entry.sets,
      reps: entry.reps > 0 ? entry.reps : null,
      duration_seconds:
        entry.durationSeconds > 0 ? entry.durationSeconds : null,
    })),
  };
}

export async function runTodaySummaryTool(
  ctx: CoachToolContext
): Promise<ToolResult> {
  const summary = await buildTodayTotals(ctx);
  const blocks = buildTodaySummaryBlocks(summary);

  return {
    summary: "Prepared today's summary.",
    blocks,
    outputForModel: buildTodaySummaryOutput(summary),
  };
}
