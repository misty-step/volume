import { format } from "date-fns";
import {
  aggregateExerciseTrend,
  formatSetMetric,
  summarizeExercisePerformance,
} from "@/lib/coach/prototype-analytics";
import { listExercises, findExercise, getRecentExerciseSets } from "./data";
import {
  formatSecondsShort,
  toAnalyticsSetInput,
  uniquePrompts,
} from "./helpers";
import { ExerciseReportArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

export async function runExerciseReportTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = ExerciseReportArgsSchema.parse(rawArgs);
  const exercises = await listExercises(ctx);
  const exercise = findExercise(exercises, args.exercise_name);

  if (!exercise) {
    return {
      summary: `Exercise "${args.exercise_name}" not found.`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: `I can't find "${args.exercise_name}"`,
          description: "Log a set first, then ask for a trend or report.",
        },
        {
          type: "suggestions",
          prompts: ["10 pushups", "show today's summary"],
        },
      ],
      outputForModel: {
        status: "error",
        error: "exercise_not_found",
        exercise_name: args.exercise_name,
      },
    };
  }

  const recentSets = await getRecentExerciseSets(ctx, exercise._id);
  if (recentSets.length === 0) {
    return {
      summary: `No history for ${exercise.name}.`,
      blocks: [
        {
          type: "status",
          tone: "info",
          title: `${exercise.name} has no history yet`,
          description: "Log your first set to start trend tracking.",
        },
        {
          type: "suggestions",
          prompts: uniquePrompts([
            `10 ${exercise.name.toLowerCase()}`,
            "show today's summary",
          ]),
        },
      ],
      outputForModel: {
        status: "ok",
        exercise_name: exercise.name,
        total_sets: 0,
      },
    };
  }

  const trend = aggregateExerciseTrend(
    recentSets.map((set) => toAnalyticsSetInput(set))
  );
  const performance = summarizeExercisePerformance(
    recentSets.map((set) => toAnalyticsSetInput(set))
  );
  const latestSet = recentSets[0];

  return {
    summary: `Prepared report for ${exercise.name}.`,
    blocks: [
      {
        type: "metrics",
        title: `${exercise.name} snapshot`,
        metrics: [
          { label: "Total sets", value: String(performance.totalSets) },
          {
            label:
              trend.metric === "duration" ? "Total duration" : "Total reps",
            value:
              trend.metric === "duration"
                ? formatSecondsShort(performance.totalDurationSeconds)
                : String(performance.totalReps),
          },
          {
            label: trend.metric === "duration" ? "Best hold" : "Best set",
            value:
              trend.metric === "duration"
                ? formatSecondsShort(performance.bestDurationSeconds)
                : `${performance.bestReps} reps`,
          },
          {
            label: "Latest",
            value: latestSet
              ? formatSetMetric(latestSet, ctx.defaultUnit)
              : "N/A",
          },
        ],
      },
      {
        type: "trend",
        title: `${exercise.name} 14-day trend`,
        subtitle: "Computed from recent logged sets.",
        metric: trend.metric,
        points: trend.points,
        total: trend.total,
        bestDay: trend.bestDay,
      },
      {
        type: "suggestions",
        prompts: uniquePrompts([
          `10 ${exercise.name.toLowerCase()}`,
          "what should I work on today?",
          "show today's summary",
        ]),
      },
    ],
    outputForModel: {
      status: "ok",
      exercise_name: exercise.name,
      total_sets: performance.totalSets,
      trend_metric: trend.metric,
      trend_total: trend.total,
      latest_set:
        latestSet !== undefined
          ? {
              performed_at: format(
                new Date(latestSet.performedAt),
                "yyyy-MM-dd"
              ),
              reps: latestSet.reps ?? null,
              duration_seconds: latestSet.duration ?? null,
              weight: latestSet.weight ?? null,
              unit: latestSet.unit ?? null,
            }
          : null,
    },
  };
}
