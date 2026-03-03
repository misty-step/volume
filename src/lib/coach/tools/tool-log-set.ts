import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import type { CoachBlock } from "@/lib/coach/schema";
import { sanitizeError } from "@/lib/coach/sanitize-error";
import { ensureExercise } from "./data";
import { formatSecondsShort } from "./helpers";
import { LogSetArgsSchema } from "./schemas";
import type {
  CoachToolContext,
  CoachToolExecutionOptions,
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
    ],
    outputForModel: {
      status: "error",
      error,
      message: description,
    },
  };
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
  const args = LogSetArgsSchema.parse(rawArgs);

  let ensured: Awaited<ReturnType<typeof ensureExercise>>;
  try {
    ensured = await ensureExercise(ctx, args.exercise_name);
  } catch (error) {
    const message = sanitizeError(
      error instanceof Error ? error.message : "Unknown error"
    );
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
    const message = sanitizeError(
      error instanceof Error ? error.message : "Unknown Convex error"
    );
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
    title: ensured.created
      ? `Logged ${description} (new exercise)`
      : `Logged ${description}`,
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

  return {
    summary: `Logged set for ${ensured.exercise.name}.`,
    blocks: [
      statusBlock,
      ...(undoBlock ? [undoBlock] : []),
      ...(undoWarningBlock ? [undoWarningBlock] : []),
    ],
    outputForModel: {
      status: "ok",
      exercise_name: ensured.exercise.name,
      created_exercise: ensured.created,
      warning: undoWarningBlock ? "undo_unavailable" : undefined,
    },
  };
}
