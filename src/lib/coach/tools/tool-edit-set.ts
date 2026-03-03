import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { formatSecondsShort } from "./helpers";
import { EditSetArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

function asSetId(value: string): Id<"sets"> {
  return value as Id<"sets">;
}

export async function runEditSetTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = EditSetArgsSchema.parse(rawArgs);
  const setId = asSetId(args.set_id);

  const set = await ctx.convex.query(api.sets.getSet, { id: setId });
  if (!set) {
    return {
      summary: "Set not found.",
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Set not found",
          description: `No set found with id ${args.set_id}. Provide a valid set_id.`,
        },
      ],
      outputForModel: { status: "error", error: "set_not_found" },
    };
  }

  const hasChanges =
    args.reps !== undefined ||
    args.weight !== undefined ||
    args.unit !== undefined ||
    args.duration_seconds !== undefined;

  if (!hasChanges) {
    return {
      summary: "No fields to update.",
      blocks: [
        {
          type: "status",
          tone: "info",
          title: "Nothing to update",
          description:
            "Provide at least one of: reps, weight, unit, duration_seconds.",
        },
      ],
      outputForModel: { status: "error", error: "no_fields_provided" },
    };
  }

  const setUnit =
    set.unit === "lbs" || set.unit === "kg" ? set.unit : undefined;
  const resolvedUnit =
    args.weight !== undefined
      ? (args.unit ?? setUnit ?? ctx.defaultUnit)
      : args.unit;

  try {
    await ctx.convex.mutation(api.sets.editSet, {
      id: setId,
      reps: args.reps,
      weight: args.weight,
      unit: resolvedUnit,
      duration: args.duration_seconds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      summary: "Edit failed.",
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Edit failed",
          description: message,
        },
      ],
      outputForModel: { status: "error", error: "edit_failed", message },
    };
  }

  const changes: string[] = [];
  if (args.reps !== undefined) changes.push(`reps → ${args.reps}`);
  if (args.weight !== undefined)
    changes.push(`weight → ${args.weight} ${resolvedUnit}`);
  else if (args.unit !== undefined) changes.push(`unit → ${args.unit}`);
  if (args.duration_seconds !== undefined)
    changes.push(`duration → ${formatSecondsShort(args.duration_seconds)}`);

  const changeDescription = changes.join(", ");

  return {
    summary: `Updated set ${args.set_id}: ${changeDescription}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Set updated",
        description: changeDescription,
      },
    ],
    outputForModel: {
      status: "ok",
      set_id: args.set_id,
      changes: {
        reps: args.reps,
        weight: args.weight,
        unit: resolvedUnit,
        duration_seconds: args.duration_seconds,
      },
    },
  };
}
