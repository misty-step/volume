import { api } from "@/../convex/_generated/api";
import { findExercise, listExercises } from "./data";
import { normalizeLookup, uniquePrompts } from "./helpers";
import {
  ExerciseNameArgsSchema,
  MergeExerciseArgsSchema,
  RenameExerciseArgsSchema,
  UpdateMuscleGroupsArgsSchema,
} from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function findExerciseByName(
  exercises: Awaited<ReturnType<typeof listExercises>>,
  name: string
) {
  const exactNormalized = normalizeLookup(name);
  const exact = exercises.find(
    (exercise) => normalizeLookup(exercise.name) === exactNormalized
  );
  if (exact) return exact;
  return findExercise(exercises, name);
}

export async function runRenameExerciseTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = RenameExerciseArgsSchema.parse(rawArgs);
  const exercises = await listExercises(ctx, { includeDeleted: true });
  const exercise = findExerciseByName(exercises, args.exercise_name);

  if (!exercise || exercise.deletedAt !== undefined) {
    return {
      summary: `Could not rename "${args.exercise_name}".`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Exercise not found",
          description:
            "I couldn't find an active exercise with that name to rename.",
        },
        {
          type: "suggestions",
          prompts: ["show exercise library", "show today's summary"],
        },
      ],
      outputForModel: { status: "error", error: "exercise_not_found" },
    };
  }

  const newName = titleCase(args.new_name);
  await ctx.convex.mutation(api.exercises.updateExercise, {
    id: exercise._id,
    name: newName,
  });

  return {
    summary: `Renamed ${exercise.name} to ${newName}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Exercise renamed",
        description: `${exercise.name} is now ${newName}.`,
      },
      {
        type: "suggestions",
        prompts: uniquePrompts([
          `show trend for ${newName.toLowerCase()}`,
          "show exercise library",
          "show history overview",
        ]),
      },
    ],
    outputForModel: {
      status: "ok",
      previous_name: exercise.name,
      new_name: newName,
    },
  };
}

export async function runDeleteExerciseTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = ExerciseNameArgsSchema.parse(rawArgs);
  const exercises = await listExercises(ctx, { includeDeleted: false });
  const exercise = findExerciseByName(exercises, args.exercise_name);

  if (!exercise) {
    return {
      summary: `Could not archive "${args.exercise_name}".`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Exercise not found",
          description: "I couldn't find that active exercise.",
        },
        {
          type: "suggestions",
          prompts: ["show exercise library", "show today's summary"],
        },
      ],
      outputForModel: { status: "error", error: "exercise_not_found" },
    };
  }

  await ctx.convex.mutation(api.exercises.deleteExercise, {
    id: exercise._id,
  });

  return {
    summary: `Archived ${exercise.name}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Exercise archived",
        description: `${exercise.name} moved to archived. History remains intact.`,
      },
      {
        type: "confirmation",
        title: "Need it back?",
        description: "You can restore this exercise anytime.",
        confirmPrompt: `restore exercise ${exercise.name}`,
        confirmLabel: "Restore",
      },
      {
        type: "suggestions",
        prompts: uniquePrompts([
          "show exercise library",
          "show history overview",
        ]),
      },
    ],
    outputForModel: {
      status: "ok",
      archived_name: exercise.name,
    },
  };
}

export async function runRestoreExerciseTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = ExerciseNameArgsSchema.parse(rawArgs);
  const exercises = await listExercises(ctx, { includeDeleted: true });
  const exercise = findExerciseByName(exercises, args.exercise_name);

  if (!exercise) {
    return {
      summary: `Could not restore "${args.exercise_name}".`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Exercise not found",
          description: "I couldn't find that exercise in your library.",
        },
      ],
      outputForModel: { status: "error", error: "exercise_not_found" },
    };
  }

  if (exercise.deletedAt === undefined) {
    return {
      summary: `${exercise.name} is already active.`,
      blocks: [
        {
          type: "status",
          tone: "info",
          title: "Already active",
          description: `${exercise.name} is already in active exercises.`,
        },
      ],
      outputForModel: { status: "ok", already_active: true },
    };
  }

  await ctx.convex.mutation(api.exercises.restoreExercise, {
    id: exercise._id,
  });

  return {
    summary: `Restored ${exercise.name}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Exercise restored",
        description: `${exercise.name} is active again.`,
      },
      {
        type: "suggestions",
        prompts: uniquePrompts([
          `show trend for ${exercise.name.toLowerCase()}`,
          "show exercise library",
          "show today's summary",
        ]),
      },
    ],
    outputForModel: { status: "ok", restored_name: exercise.name },
  };
}

export async function runMergeExerciseTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = MergeExerciseArgsSchema.parse(rawArgs);
  const exercises = await listExercises(ctx, { includeDeleted: true });
  const sourceExercise = findExerciseByName(exercises, args.source_exercise);
  const targetExercise = findExerciseByName(exercises, args.target_exercise);

  if (!sourceExercise) {
    return {
      summary: `Could not merge from "${args.source_exercise}".`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Source exercise not found",
          description: "I couldn't find that source exercise in your library.",
        },
        {
          type: "suggestions",
          prompts: ["show exercise library", "show today's summary"],
        },
      ],
      outputForModel: { status: "error", error: "source_exercise_not_found" },
    };
  }

  if (sourceExercise.deletedAt !== undefined) {
    return {
      summary: `${sourceExercise.name} is already archived.`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Source already archived",
          description:
            "Pick an active source exercise so historical sets can be moved.",
        },
      ],
      outputForModel: {
        status: "error",
        error: "source_exercise_archived",
      },
    };
  }

  if (!targetExercise) {
    return {
      summary: `Could not merge into "${args.target_exercise}".`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Target exercise not found",
          description: "I couldn't find that target exercise in your library.",
        },
        {
          type: "suggestions",
          prompts: ["show exercise library", "show today's summary"],
        },
      ],
      outputForModel: { status: "error", error: "target_exercise_not_found" },
    };
  }

  if (targetExercise.deletedAt !== undefined) {
    return {
      summary: `${targetExercise.name} is archived.`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Target is archived",
          description:
            "Restore the target exercise first, then retry the merge.",
        },
      ],
      outputForModel: { status: "error", error: "target_exercise_archived" },
    };
  }

  if (sourceExercise._id === targetExercise._id) {
    return {
      summary: "Merge skipped.",
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Same exercise selected",
          description:
            "Choose two different exercises: one source and one target.",
        },
      ],
      outputForModel: { status: "error", error: "same_exercise" },
    };
  }

  const merged = await ctx.convex.mutation(api.exercises.mergeExercise, {
    fromId: sourceExercise._id,
    toId: targetExercise._id,
  });

  const setLabel = merged.mergedCount === 1 ? "set" : "sets";

  return {
    summary: `Merged ${sourceExercise.name} into ${merged.keptExercise}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Exercises merged",
        description: `Moved ${merged.mergedCount} historical ${setLabel} into ${merged.keptExercise}. ${sourceExercise.name} is now archived.`,
      },
      {
        type: "suggestions",
        prompts: uniquePrompts([
          `show trend for ${merged.keptExercise.toLowerCase()}`,
          "show exercise library",
          "show history overview",
        ]),
      },
    ],
    outputForModel: {
      status: "ok",
      source_exercise: sourceExercise.name,
      target_exercise: merged.keptExercise,
      merged_count: merged.mergedCount,
    },
  };
}

export async function runUpdateExerciseMuscleGroupsTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = UpdateMuscleGroupsArgsSchema.parse(rawArgs);
  const exercises = await listExercises(ctx, { includeDeleted: false });
  const exercise = findExerciseByName(exercises, args.exercise_name);

  if (!exercise) {
    return {
      summary: `Could not update groups for "${args.exercise_name}".`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Exercise not found",
          description: "I couldn't find that active exercise.",
        },
      ],
      outputForModel: { status: "error", error: "exercise_not_found" },
    };
  }

  const muscleGroups = Array.from(
    new Set(
      args.muscle_groups
        .map((group) => titleCase(group))
        .filter((group) => group.length > 0)
    )
  );

  await ctx.convex.mutation(api.exercises.updateMuscleGroups, {
    id: exercise._id,
    muscleGroups,
  });

  return {
    summary: `Updated muscle groups for ${exercise.name}.`,
    blocks: [
      {
        type: "detail_panel",
        title: "Muscle groups updated",
        fields: [
          { label: "Exercise", value: exercise.name, emphasis: true },
          { label: "Groups", value: muscleGroups.join(", ") || "Other" },
        ],
        prompts: ["show exercise library", "show analytics overview"],
      },
    ],
    outputForModel: {
      status: "ok",
      exercise_name: exercise.name,
      muscle_groups: muscleGroups,
    },
  };
}
