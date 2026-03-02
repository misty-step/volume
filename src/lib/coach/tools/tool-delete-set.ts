import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import type { Set } from "@/types/domain";
import { resolveExercise, getRecentExerciseSets } from "./data";
import { DeleteSetArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

function asSetId(value: string): Id<"sets"> {
  return value as Id<"sets">;
}

export async function runDeleteSetTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = DeleteSetArgsSchema.parse(rawArgs);

  let targetSetId: Id<"sets"> | null = null;
  let sourceLabel = "";

  if (args.set_id) {
    targetSetId = asSetId(args.set_id);
    sourceLabel = `set ${args.set_id}`;
  } else {
    const { exercise } = await resolveExercise(ctx, args.exercise_name ?? "", {
      includeDeleted: true,
    });
    if (!exercise) {
      return {
        summary: "Set delete failed.",
        blocks: [
          {
            type: "status",
            tone: "error",
            title: "Exercise not found",
            description:
              "I couldn't find that exercise. Provide a valid set id or exercise name.",
          },
        ],
        outputForModel: { status: "error", error: "exercise_not_found" },
      };
    }

    const recentSets = (await getRecentExerciseSets(
      ctx,
      exercise._id
    )) as Set[];
    const target = recentSets[0];
    if (!target) {
      return {
        summary: "No set available to delete.",
        blocks: [
          {
            type: "status",
            tone: "info",
            title: "No sets found",
            description: `No logged sets found for ${exercise.name}.`,
          },
        ],
        outputForModel: { status: "ok", deleted: false, reason: "no_sets" },
      };
    }

    targetSetId = target._id;
    sourceLabel = `latest ${exercise.name} set`;
  }

  try {
    await ctx.convex.mutation(api.sets.deleteSet, { id: targetSetId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      summary: "Set delete failed.",
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Delete failed",
          description: message,
        },
      ],
      outputForModel: { status: "error", error: "delete_failed", message },
    };
  }

  return {
    summary: `Deleted ${sourceLabel}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Set deleted",
        description: `Deleted ${sourceLabel}.`,
      },
    ],
    outputForModel: {
      status: "ok",
      deleted: true,
      set_id: String(targetSetId),
    },
  };
}
