import { format } from "date-fns";
import {
  aggregateExerciseTrend,
  formatSetMetric,
  summarizeExercisePerformance,
} from "@/lib/coach/prototype-analytics";
import { resolveExercise, getRecentExerciseSets } from "./data";
import { formatSecondsShort, toAnalyticsSetInput } from "./helpers";
import { ExerciseReportArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

async function resolveExerciseData(rawArgs: unknown, ctx: CoachToolContext) {
  const args = ExerciseReportArgsSchema.parse(rawArgs);
  const { exercise } = await resolveExercise(ctx, args.exercise_name);

  if (!exercise) {
    return {
      ok: false as const,
      errorResult: {
        summary: `Exercise "${args.exercise_name}" not found.`,
        blocks: [
          {
            type: "status",
            tone: "error",
            title: `I can't find "${args.exercise_name}"`,
            description: "Log a set first, then ask for a trend or report.",
          },
        ],
        outputForModel: {
          status: "error",
          error: "exercise_not_found",
          exercise_name: args.exercise_name,
        },
      } satisfies ToolResult,
    };
  }

  const recentSets = await getRecentExerciseSets(ctx, exercise._id);
  if (recentSets.length === 0) {
    return {
      ok: false as const,
      errorResult: {
        summary: `No history for ${exercise.name}.`,
        blocks: [
          {
            type: "status",
            tone: "info",
            title: `${exercise.name} has no history yet`,
            description: "Log your first set to start trend tracking.",
          },
        ],
        outputForModel: {
          status: "ok",
          exercise_name: exercise.name,
          total_sets: 0,
        },
      } satisfies ToolResult,
    };
  }

  const analyticsInput = recentSets.map((set) => toAnalyticsSetInput(set));
  return {
    ok: true as const,
    exercise,
    recentSets,
    trend: aggregateExerciseTrend(analyticsInput),
    performance: summarizeExercisePerformance(analyticsInput),
  };
}

export async function runExerciseSnapshotTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const data = await resolveExerciseData(rawArgs, ctx);
  if (!data.ok) return data.errorResult;

  const { exercise, recentSets, trend, performance } = data;
  const latestSet = recentSets[0];

  return {
    summary: `Prepared snapshot for ${exercise.name}.`,
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
    ],
    outputForModel: {
      status: "ok",
      exercise_name: exercise.name,
      total_sets: performance.totalSets,
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

export async function runExerciseTrendTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const data = await resolveExerciseData(rawArgs, ctx);
  if (!data.ok) return data.errorResult;

  const { exercise, trend } = data;

  return {
    summary: `Prepared trend for ${exercise.name}.`,
    blocks: [
      {
        type: "trend",
        title: `${exercise.name} 14-day trend`,
        subtitle: "Computed from recent logged sets.",
        metric: trend.metric,
        points: trend.points,
        total: trend.total,
        bestDay: trend.bestDay,
      },
    ],
    outputForModel: {
      status: "ok",
      exercise_name: exercise.name,
      trend_metric: trend.metric,
      trend_total: trend.total,
    },
  };
}
