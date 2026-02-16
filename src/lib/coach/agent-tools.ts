import type { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { format } from "date-fns";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { getTodayRange } from "@/lib/date-utils";
import type { Exercise } from "@/types/domain";
import { formatDuration } from "@/lib/date-utils";
import {
  aggregateExerciseTrend,
  formatSetMetric,
  summarizeExercisePerformance,
  summarizeTodaySets,
} from "@/lib/coach/prototype-analytics";
import type { CoachBlock } from "@/lib/coach/schema";

type WeightUnit = "lbs" | "kg";

type SetInput = {
  exerciseId: Id<"exercises">;
  performedAt: number;
  reps?: number;
  duration?: number;
  weight?: number;
  unit?: string;
};

type FocusSuggestion = {
  type: "exercise" | "muscle_group" | "balance";
  priority: "high" | "medium" | "low";
  title: string;
  reason: string;
  suggestedExercises?: string[];
};

type ToolResult = {
  summary: string;
  blocks: CoachBlock[];
  outputForModel: Record<string, unknown>;
};

export type CoachToolExecutionOptions = {
  onBlocks?: (blocks: CoachBlock[]) => void;
};

export interface CoachToolContext {
  convex: ConvexHttpClient;
  defaultUnit: WeightUnit;
}

const LogSetArgsSchema = z
  .object({
    exercise_name: z.string().trim().min(1).max(80),
    reps: z.number().int().min(1).max(1000).optional(),
    duration_seconds: z.number().int().min(1).max(86_400).optional(),
    weight: z.number().min(0).max(5000).optional(),
    unit: z.enum(["lbs", "kg"]).optional(),
  })
  .refine(
    (data) =>
      (data.reps !== undefined && data.duration_seconds === undefined) ||
      (data.reps === undefined && data.duration_seconds !== undefined),
    {
      message: "Provide exactly one of reps or duration_seconds.",
      path: ["reps"],
    }
  );

const ExerciseReportArgsSchema = z.object({
  exercise_name: z.string().trim().min(1).max(80),
});

const SetWeightUnitArgsSchema = z.object({
  unit: z.enum(["lbs", "kg"]),
});

const SetSoundArgsSchema = z.object({
  enabled: z.boolean(),
});

function normalizeLookup(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toSetInput(set: SetInput) {
  return {
    exerciseId: String(set.exerciseId),
    performedAt: set.performedAt,
    reps: set.reps,
    duration: set.duration,
    weight: set.weight,
    unit: set.unit,
  };
}

function uniquePrompts(prompts: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const prompt of prompts) {
    const normalized = prompt.toLowerCase().trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(prompt);
    if (output.length >= 4) break;
  }

  return output;
}

function formatSecondsShort(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return formatDuration(seconds);
}

async function listExercises(ctx: CoachToolContext): Promise<Exercise[]> {
  return (await ctx.convex.query(api.exercises.listExercises, {
    includeDeleted: false,
  })) as Exercise[];
}

async function getTodaySets(ctx: CoachToolContext): Promise<SetInput[]> {
  const { start, end } = getTodayRange();
  return (await ctx.convex.query(api.sets.listSetsForDateRange, {
    startDate: start,
    endDate: end,
  })) as SetInput[];
}

async function getRecentExerciseSets(
  ctx: CoachToolContext,
  exerciseId: Id<"exercises">
): Promise<SetInput[]> {
  return (await ctx.convex.query(api.sets.getRecentSetsForExercise, {
    exerciseId,
    limit: 120,
  })) as SetInput[];
}

function findExercise(exercises: Exercise[], name: string): Exercise | null {
  const normalized = normalizeLookup(name);
  const exact = exercises.find(
    (exercise) => normalizeLookup(exercise.name) === normalized
  );
  if (exact) return exact;

  const partial = exercises.find((exercise) => {
    const candidate = normalizeLookup(exercise.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });
  return partial ?? null;
}

async function ensureExercise(
  ctx: CoachToolContext,
  exerciseName: string
): Promise<{ exercise: Exercise; created: boolean }> {
  const exercises = await listExercises(ctx);
  const matched = findExercise(exercises, exerciseName);
  if (matched) {
    return { exercise: matched, created: false };
  }

  const normalizedName = titleCase(exerciseName);
  const createdId = (await ctx.convex.action(api.exercises.createExercise, {
    name: normalizedName,
  })) as Id<"exercises">;

  return {
    exercise: {
      _id: createdId,
      userId: "",
      name: normalizedName,
      createdAt: Date.now(),
    },
    created: true,
  };
}

function buildTodaySummaryBlocks(
  sets: SetInput[],
  exerciseNames: Map<string, string>
): CoachBlock[] {
  const summary = summarizeTodaySets(
    sets.map((set) => toSetInput(set)),
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

async function runLogSetTool(
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
): Promise<ToolResult> {
  const args = LogSetArgsSchema.parse(rawArgs);
  const ensured = await ensureExercise(ctx, args.exercise_name);
  const resolvedUnit = args.unit ?? ctx.defaultUnit;

  const description =
    args.duration_seconds !== undefined
      ? `${formatSecondsShort(args.duration_seconds)} ${ensured.exercise.name}`
      : `${args.reps ?? 0} ${ensured.exercise.name.toLowerCase()}`;

  await ctx.convex.mutation(api.sets.logSet, {
    exerciseId: ensured.exercise._id,
    reps: args.reps,
    duration: args.duration_seconds,
    weight: args.weight,
    unit: args.weight !== undefined ? resolvedUnit : undefined,
  });

  const statusBlock: CoachBlock = {
    type: "status",
    tone: "success",
    title: `Logged ${description}`,
    description: ensured.created
      ? `Created exercise "${ensured.exercise.name}" and saved your set.`
      : "Set saved successfully.",
  };
  options?.onBlocks?.([statusBlock]);

  const [todaySets, recentSets, exercises] = await Promise.all([
    getTodaySets(ctx),
    getRecentExerciseSets(ctx, ensured.exercise._id),
    listExercises(ctx),
  ]);

  const exerciseNames = new Map<string, string>();
  for (const exercise of exercises) {
    exerciseNames.set(String(exercise._id), exercise.name);
  }
  exerciseNames.set(String(ensured.exercise._id), ensured.exercise.name);

  const todaySummary = summarizeTodaySets(
    todaySets.map((set) => toSetInput(set)),
    exerciseNames
  );
  const performance = summarizeExercisePerformance(
    recentSets.map((set) => toSetInput(set))
  );
  const trend = aggregateExerciseTrend(
    recentSets.map((set) => toSetInput(set))
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

async function runTodaySummaryTool(ctx: CoachToolContext): Promise<ToolResult> {
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
    sets.map((set) => toSetInput(set)),
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

async function runExerciseReportTool(
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
    recentSets.map((set) => toSetInput(set))
  );
  const performance = summarizeExercisePerformance(
    recentSets.map((set) => toSetInput(set))
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

async function runFocusSuggestionsTool(
  ctx: CoachToolContext
): Promise<ToolResult> {
  const suggestions = (await ctx.convex.query(
    api.analyticsFocus.getFocusSuggestions,
    {}
  )) as FocusSuggestion[];

  if (suggestions.length === 0) {
    return {
      summary: "No focus gaps found yet.",
      blocks: [
        {
          type: "status",
          tone: "info",
          title: "No major training gaps detected",
          description:
            "Keep logging consistently and ask again after more sessions.",
        },
        {
          type: "suggestions",
          prompts: [
            "show today's summary",
            "show trend for pushups",
            "show trend for squats",
          ],
        },
      ],
      outputForModel: {
        status: "ok",
        suggestions: [],
      },
    };
  }

  const rows = suggestions.map((item) => ({
    label: item.title,
    value: item.priority.toUpperCase(),
    meta: item.reason,
  }));

  const prompts: string[] = ["show today's summary"];
  for (const item of suggestions) {
    if (item.title.toLowerCase().startsWith("train ")) {
      const exercise = item.title.slice("train ".length).trim();
      prompts.push(`show trend for ${exercise.toLowerCase()}`);
      prompts.push(`10 ${exercise.toLowerCase()}`);
    }
    if (item.suggestedExercises && item.suggestedExercises.length > 0) {
      prompts.push(
        `show trend for ${item.suggestedExercises[0]!.toLowerCase()}`
      );
    }
  }

  return {
    summary: "Prepared focus suggestions.",
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Today's focus plan",
        description: "Based on your logged history and balance checks.",
      },
      {
        type: "table",
        title: "What to work on today",
        rows,
      },
      {
        type: "suggestions",
        prompts: uniquePrompts(prompts),
      },
    ],
    outputForModel: {
      status: "ok",
      suggestions: suggestions.map((item) => ({
        title: item.title,
        priority: item.priority,
        reason: item.reason,
      })),
    },
  };
}

function runSetWeightUnitTool(rawArgs: unknown): ToolResult {
  const args = SetWeightUnitArgsSchema.parse(rawArgs);
  return {
    summary: `Set weight unit to ${args.unit}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: `Weight unit set to ${args.unit.toUpperCase()}`,
        description: "Applied locally for future logging.",
      },
      {
        type: "client_action",
        action: "set_weight_unit",
        payload: { unit: args.unit },
      },
      {
        type: "suggestions",
        prompts: ["10 pushups", "show today's summary"],
      },
    ],
    outputForModel: {
      status: "ok",
      unit: args.unit,
    },
  };
}

function runSetSoundTool(rawArgs: unknown): ToolResult {
  const args = SetSoundArgsSchema.parse(rawArgs);
  return {
    summary: `Set tactile sounds ${args.enabled ? "on" : "off"}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: `Tactile sounds ${args.enabled ? "enabled" : "disabled"}`,
        description: "Applied locally.",
      },
      {
        type: "client_action",
        action: "set_sound",
        payload: { enabled: args.enabled },
      },
      {
        type: "suggestions",
        prompts: ["show today's summary", "what should I work on today?"],
      },
    ],
    outputForModel: {
      status: "ok",
      enabled: args.enabled,
    },
  };
}

export const COACH_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "log_set",
      description:
        "Log a workout set. Use reps for rep-based movements and duration_seconds for timed holds.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          exercise_name: { type: "string" },
          reps: { type: "number" },
          duration_seconds: { type: "number" },
          weight: { type: "number" },
          unit: { type: "string", enum: ["lbs", "kg"] },
        },
        required: ["exercise_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_summary",
      description: "Get today's workout totals and top exercises.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_exercise_report",
      description: "Get a focused report and trend for a specific exercise.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          exercise_name: { type: "string" },
        },
        required: ["exercise_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_focus_suggestions",
      description:
        "Get prioritized suggestions for what the user should work on today based on imbalance and recency.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_weight_unit",
      description: "Set local default weight unit preference.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          unit: { type: "string", enum: ["lbs", "kg"] },
        },
        required: ["unit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_sound",
      description: "Enable or disable local tactile sound preference.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          enabled: { type: "boolean" },
        },
        required: ["enabled"],
      },
    },
  },
] as const;

export async function executeCoachTool(
  toolName: string,
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
): Promise<ToolResult> {
  if (toolName === "log_set") {
    return runLogSetTool(rawArgs, ctx, options);
  }

  if (toolName === "get_today_summary") {
    return runTodaySummaryTool(ctx);
  }

  if (toolName === "get_exercise_report") {
    return runExerciseReportTool(rawArgs, ctx);
  }

  if (toolName === "get_focus_suggestions") {
    return runFocusSuggestionsTool(ctx);
  }

  if (toolName === "set_weight_unit") {
    return runSetWeightUnitTool(rawArgs);
  }

  if (toolName === "set_sound") {
    return runSetSoundTool(rawArgs);
  }

  return {
    summary: `Unsupported tool: ${toolName}`,
    blocks: [
      {
        type: "status",
        tone: "error",
        title: "Unsupported action",
        description: `${toolName} is not available.`,
      },
      {
        type: "suggestions",
        prompts: ["show today's summary", "what should I work on today?"],
      },
    ],
    outputForModel: {
      status: "error",
      error: "unsupported_tool",
      tool: toolName,
    },
  };
}
