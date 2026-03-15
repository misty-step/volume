import type { TodayTotalsSummary } from "@/lib/coach/prototype-analytics";
import type { CoachBlock } from "@/lib/coach/schema";
import { buildTodayTotals } from "./data";
import { formatSecondsShort } from "./helpers";
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
  ];
}

export async function runTodaySummaryTool(
  ctx: CoachToolContext
): Promise<ToolResult> {
  const summary = await buildTodayTotals(ctx);
  const blocks = buildTodaySummaryBlocks(summary);

  return {
    summary: "Prepared today's summary.",
    blocks,
    outputForModel: {
      status: "ok",
      total_sets: summary.totalSets,
      total_reps: summary.totalReps,
      exercise_count: summary.topExercises.length,
    },
  };
}
