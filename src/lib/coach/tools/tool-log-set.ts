import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  aggregateExerciseTrend,
  summarizeExercisePerformance,
  summarizeTodaySets,
} from "@/lib/coach/prototype-analytics";
import type { CoachBlock } from "@/lib/coach/schema";
import {
  ensureExercise,
  getRecentExerciseSets,
  getTodaySets,
  listExercises,
} from "./data";
import {
  formatSecondsShort,
  toAnalyticsSetInput,
  uniquePrompts,
} from "./helpers";
import { LogSetArgsSchema } from "./schemas";
import type {
  CoachToolContext,
  CoachToolExecutionOptions,
  SetInput,
  ToolResult,
} from "./types";

function toolErrorResult({
  title,
  description,
  error,
}: {
  title: string;
  description: string;
  error: string;
}): ToolResult {
  return {
    summary: description,
    blocks: [
      {
        type: "status",
        tone: "error",
        title,
        description,
      },
      {
        type: "suggestions",
        prompts: ["show today's summary", "what should I work on today?"],
      },
    ],
    outputForModel: {
      status: "error",
      error,
      message: description,
    },
  };
}

function buildExerciseNameMap(
  exercises: Array<{ _id: Id<"exercises">; name: string }>,
  ensuredExerciseId: Id<"exercises">,
  ensuredName: string
): Map<string, string> {
  const exerciseNames = new Map<string, string>();
  for (const exercise of exercises) {
    exerciseNames.set(String(exercise._id), exercise.name);
  }
  exerciseNames.set(String(ensuredExerciseId), ensuredName);
  return exerciseNames;
}

export async function runLogSetTool(
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
): Promise<ToolResult> {
  const args = LogSetArgsSchema.parse(rawArgs);

  let ensured: {
    exercise: { _id: Id<"exercises">; name: string };
    created: boolean;
  };
  try {
    ensured = await ensureExercise(ctx, args.exercise_name);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return toolErrorResult({
      title: "Couldn't create that exercise",
      description: message,
      error: "exercise_create_failed",
    });
  }

  const resolvedUnit = args.unit ?? ctx.defaultUnit;
  const description =
    args.duration_seconds !== undefined
      ? `${formatSecondsShort(args.duration_seconds)} ${ensured.exercise.name}`
      : `${args.reps ?? 0} ${ensured.exercise.name.toLowerCase()}`;

  try {
    await ctx.convex.mutation(api.sets.logSet, {
      exerciseId: ensured.exercise._id,
      reps: args.reps,
      duration: args.duration_seconds,
      weight: args.weight,
      unit: args.weight !== undefined ? resolvedUnit : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Convex error";
    return toolErrorResult({
      title: "Couldn't log that set",
      description: message,
      error: "log_set_failed",
    });
  }

  const statusBlock: CoachBlock = {
    type: "status",
    tone: "success",
    title: `Logged ${description}`,
    description: ensured.created
      ? `Created exercise "${ensured.exercise.name}" and saved your set.`
      : "Set saved successfully.",
  };
  options?.onBlocks?.([statusBlock]);

  let todaySets: SetInput[];
  let recentSets: SetInput[];
  let exercises: Array<{ _id: Id<"exercises">; name: string }>;
  try {
    [todaySets, recentSets, exercises] = await Promise.all([
      getTodaySets(ctx),
      getRecentExerciseSets(ctx, ensured.exercise._id),
      listExercises(ctx),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Convex error";
    return {
      summary: `Logged set for ${ensured.exercise.name}.`,
      blocks: [
        statusBlock,
        {
          type: "status",
          tone: "info",
          title: "Logged, but couldn't fetch summary",
          description: message,
        },
        {
          type: "suggestions",
          prompts: uniquePrompts([
            "show today's summary",
            `show trend for ${ensured.exercise.name.toLowerCase()}`,
          ]),
        },
      ],
      outputForModel: {
        status: "ok",
        exercise_name: ensured.exercise.name,
        created_exercise: ensured.created,
        warning: "summary_fetch_failed",
        warning_message: message,
      },
    };
  }

  const exerciseNames = buildExerciseNameMap(
    exercises,
    ensured.exercise._id,
    ensured.exercise.name
  );

  const todaySummary = summarizeTodaySets(
    todaySets.map((set) => toAnalyticsSetInput(set)),
    exerciseNames
  );
  const performance = summarizeExercisePerformance(
    recentSets.map((set) => toAnalyticsSetInput(set))
  );
  const trend = aggregateExerciseTrend(
    recentSets.map((set) => toAnalyticsSetInput(set))
  );

  const metricsBlock: CoachBlock = {
    type: "metrics",
    title: "Immediate impact",
    metrics: [
      { label: "Today's sets", value: String(todaySummary.totalSets) },
      { label: "Today's reps", value: String(todaySummary.totalReps) },
      {
        label: `${ensured.exercise.name} sets`,
        value: String(performance.totalSets),
      },
      {
        label:
          trend.metric === "duration"
            ? `${ensured.exercise.name} duration`
            : `${ensured.exercise.name} reps`,
        value:
          trend.metric === "duration"
            ? formatSecondsShort(performance.totalDurationSeconds)
            : String(performance.totalReps),
      },
    ],
  };
  options?.onBlocks?.([metricsBlock]);

  const trendBlock: CoachBlock = {
    type: "trend",
    title: `${ensured.exercise.name} 14-day trend`,
    subtitle: "Generated from your deterministic set history.",
    metric: trend.metric,
    points: trend.points,
    total: trend.total,
    bestDay: trend.bestDay,
  };
  options?.onBlocks?.([trendBlock]);

  const suggestionsBlock: CoachBlock = {
    type: "suggestions",
    prompts: uniquePrompts([
      "what should I work on today?",
      `show trend for ${ensured.exercise.name.toLowerCase()}`,
      "show today's summary",
    ]),
  };
  options?.onBlocks?.([suggestionsBlock]);

  return {
    summary: `Logged set for ${ensured.exercise.name}.`,
    blocks: [statusBlock, metricsBlock, trendBlock, suggestionsBlock],
    outputForModel: {
      status: "ok",
      exercise_name: ensured.exercise.name,
      created_exercise: ensured.created,
      today_sets: todaySummary.totalSets,
      today_reps: todaySummary.totalReps,
      trend_metric: trend.metric,
      trend_total: trend.total,
    },
  };
}
