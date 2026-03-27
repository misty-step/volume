import { api } from "@/../convex/_generated/api";
import {
  findCloseMatches,
  findExercise,
  listExercises,
  resolveExercise,
} from "./data";
import { exerciseNotFoundResult, titleCase } from "./helpers";
import {
  ExerciseNameArgsSchema,
  ManageExerciseArgsSchema,
  MergeExerciseArgsSchema,
  RenameExerciseArgsSchema,
  UpdateMuscleGroupsArgsSchema,
} from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

export async function runManageExerciseTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = ManageExerciseArgsSchema.parse(rawArgs);

  switch (args.action) {
    case "rename":
      return runRenameExerciseTool(
        {
          exercise_name: args.exercise_name,
          new_name: args.new_name,
        },
        ctx
      );
    case "delete":
      return runDeleteExerciseTool({ exercise_name: args.exercise_name }, ctx);
    case "restore":
      return runRestoreExerciseTool({ exercise_name: args.exercise_name }, ctx);
    case "merge":
      return runMergeExerciseTool(
        {
          source_exercise: args.source_exercise,
          target_exercise: args.target_exercise,
        },
        ctx
      );
    case "update_muscle_groups":
      return runUpdateExerciseMuscleGroupsTool(
        {
          exercise_name: args.exercise_name,
          muscle_groups: args.muscle_groups,
        },
        ctx
      );
    default: {
      const _exhaustive: never = args;
      throw new Error(
        `Unhandled manage_exercise action: ${String(_exhaustive)}`
      );
    }
  }
}

export async function runRenameExerciseTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = RenameExerciseArgsSchema.parse(rawArgs);
  const { exercise, closeMatches } = await resolveExercise(
    ctx,
    args.exercise_name,
    { includeDeleted: true }
  );

  if (!exercise || exercise.deletedAt !== undefined) {
    return exerciseNotFoundResult(
      args.exercise_name,
      "exercise_not_found",
      "I couldn't find an active exercise with that name to rename.",
      closeMatches.map((e) => e.name)
    );
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
  const { exercise, closeMatches } = await resolveExercise(
    ctx,
    args.exercise_name
  );

  if (!exercise) {
    return exerciseNotFoundResult(
      args.exercise_name,
      "exercise_not_found",
      "I couldn't find that exercise in your library.",
      closeMatches.map((e) => e.name)
    );
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
  const { exercise, closeMatches } = await resolveExercise(
    ctx,
    args.exercise_name,
    { includeDeleted: true }
  );

  if (!exercise) {
    return exerciseNotFoundResult(
      args.exercise_name,
      "exercise_not_found",
      "I couldn't find that exercise in your library.",
      closeMatches.map((e) => e.name)
    );
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
  const sourceExercise = await findExercise(
    ctx,
    args.source_exercise,
    exercises
  );
  const targetExercise = await findExercise(
    ctx,
    args.target_exercise,
    exercises
  );

  if (!sourceExercise) {
    const active = exercises.filter((e) => !e.deletedAt);
    const sourceMatches = findCloseMatches(args.source_exercise, active);
    return exerciseNotFoundResult(
      args.source_exercise,
      "source_exercise_not_found",
      "I couldn't find that source exercise in your library.",
      sourceMatches.map((e) => e.name)
    );
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
    const active = exercises.filter((e) => !e.deletedAt);
    const targetMatches = findCloseMatches(args.target_exercise, active);
    return exerciseNotFoundResult(
      args.target_exercise,
      "target_exercise_not_found",
      "I couldn't find that target exercise in your library.",
      targetMatches.map((e) => e.name)
    );
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
  const { exercise, closeMatches } = await resolveExercise(
    ctx,
    args.exercise_name
  );

  if (!exercise) {
    return exerciseNotFoundResult(
      args.exercise_name,
      "exercise_not_found",
      "I couldn't find that exercise in your library.",
      closeMatches.map((e) => e.name)
    );
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
