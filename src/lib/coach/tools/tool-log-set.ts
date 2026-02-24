import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  aggregateExerciseTrend,
  summarizeExercisePerformance,
  summarizeTodaySets,
} from "@/lib/coach/prototype-analytics";
import { parseCoachIntent } from "@/lib/coach/prototype-intent";
import type { CoachBlock } from "@/lib/coach/schema";
import { ensureExercise, getRecentExerciseSets, getTodaySets } from "./data";
import {
  formatSecondsShort,
  normalizeLookup,
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

export function preferParsedSetArgs(
  rawArgs: {
    exercise_name: string;
    reps?: number;
    duration_seconds?: number;
    weight?: number;
    unit?: "lbs" | "kg";
  },
  userInput?: string
): typeof rawArgs {
  if (!userInput) return rawArgs;
  const intent = parseCoachIntent(userInput);
  if (intent.type !== "log_set") return rawArgs;
  const parsedName = normalizeLookup(intent.exerciseName);
  const toolName = normalizeLookup(rawArgs.exercise_name);
  const matches =
    parsedName === toolName ||
    parsedName.includes(toolName) ||
    toolName.includes(parsedName);
  if (!matches) {
    return rawArgs;
  }

  if (intent.reps !== undefined) {
    return {
      ...rawArgs,
      reps: intent.reps,
      duration_seconds: undefined,
      weight: intent.weight ?? rawArgs.weight,
      unit: intent.unit ?? rawArgs.unit,
    };
  }

  if (intent.durationSeconds !== undefined) {
    return {
      ...rawArgs,
      reps: undefined,
      duration_seconds: intent.durationSeconds,
      weight: intent.weight ?? rawArgs.weight,
      unit: intent.unit ?? rawArgs.unit,
    };
  }

  return rawArgs;
}

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

function parseMutationId(value: unknown, label: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new Error(`Invalid ${label} returned from Convex mutation.`);
}

export async function runLogSetTool(
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
): Promise<ToolResult> {
  const args = preferParsedSetArgs(
    LogSetArgsSchema.parse(rawArgs),
    ctx.userInput
  );

  let ensured: Awaited<ReturnType<typeof ensureExercise>>;
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

  let setId: Id<"sets">;
  try {
    const loggedSetId = await ctx.convex.mutation(api.sets.logSet, {
      exerciseId: ensured.exercise._id,
      reps: args.reps,
      duration: args.duration_seconds,
      weight: args.weight,
      unit: args.weight !== undefined ? resolvedUnit : undefined,
    });
    setId = parseMutationId(loggedSetId, "set id") as Id<"sets">;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Convex error";
    return toolErrorResult({
      title: "Couldn't log that set",
      description: message,
      error: "log_set_failed",
    });
  }

  let actionId: string | null = null;
  let undoWarningBlock: CoachBlock | null = null;
  try {
    const recordedActionId = await ctx.convex.mutation(
      api.agentActions.recordLogSetAction,
      {
        turnId: ctx.turnId,
        setId,
        exerciseId: ensured.exercise._id,
        exerciseName: ensured.exercise.name,
        reps: args.reps,
        duration: args.duration_seconds,
        weight: args.weight,
        unit: args.weight !== undefined ? resolvedUnit : undefined,
        performedAt: Date.now(),
      }
    );
    actionId = parseMutationId(recordedActionId, "agent action id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn("Failed to record agent action for undo", {
      turnId: ctx.turnId,
      setId: String(setId),
      message,
    });
    undoWarningBlock = {
      type: "status",
      tone: "info",
      title: "Undo unavailable",
      description:
        "Set was logged, but undo could not be prepared for this entry.",
    };
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

  const undoBlock: CoachBlock | null = actionId
    ? {
        type: "undo",
        actionId,
        turnId: ctx.turnId,
        title: "Undo this log",
        description: "Reverts this set if nothing changed since it was logged.",
      }
    : null;
  if (undoBlock) {
    options?.onBlocks?.([undoBlock]);
  }
  if (undoWarningBlock) {
    options?.onBlocks?.([undoWarningBlock]);
  }

  let todaySets: SetInput[];
  let recentSets: SetInput[];
  try {
    [todaySets, recentSets] = await Promise.all([
      getTodaySets(ctx),
      getRecentExerciseSets(ctx, ensured.exercise._id),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Convex error";
    return {
      summary: `Logged set for ${ensured.exercise.name}.`,
      blocks: [
        statusBlock,
        ...(undoBlock ? [undoBlock] : []),
        ...(undoWarningBlock ? [undoWarningBlock] : []),
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

  const exercises = ensured.exercises;
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
    blocks: [
      statusBlock,
      ...(undoBlock ? [undoBlock] : []),
      ...(undoWarningBlock ? [undoWarningBlock] : []),
      metricsBlock,
      trendBlock,
      suggestionsBlock,
    ],
    outputForModel: {
      status: "ok",
      exercise_name: ensured.exercise.name,
      created_exercise: ensured.created,
      today_sets: todaySummary.totalSets,
      today_reps: todaySummary.totalReps,
      trend_metric: trend.metric,
      trend_total: trend.total,
      warning: undoWarningBlock ? "undo_unavailable" : undefined,
    },
  };
}
