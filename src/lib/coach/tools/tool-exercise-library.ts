import { listExercises } from "./data";
import { uniquePrompts } from "./helpers";
import type { CoachToolContext, ToolResult } from "./types";

export async function runExerciseLibraryTool(
  ctx: CoachToolContext
): Promise<ToolResult> {
  const exercises = await listExercises(ctx, { includeDeleted: true });

  const activeCount = exercises.filter(
    (exercise) => exercise.deletedAt === undefined
  ).length;
  const archivedCount = exercises.length - activeCount;

  return {
    summary: `Loaded ${exercises.length} exercises.`,
    blocks: [
      {
        type: "detail_panel",
        title: "Exercise library",
        fields: [
          { label: "Active", value: String(activeCount), emphasis: true },
          { label: "Archived", value: String(archivedCount) },
          { label: "Total", value: String(exercises.length) },
        ],
        prompts: [
          "show today's summary",
          "show history overview",
          "show analytics overview",
        ],
      },
      {
        type: "entity_list",
        title: "Exercises",
        emptyLabel: "No exercises yet. Log your first set to auto-create one.",
        items: exercises.map((exercise) => {
          const archived = exercise.deletedAt !== undefined;
          const groups =
            exercise.muscleGroups && exercise.muscleGroups.length > 0
              ? exercise.muscleGroups.join(", ")
              : "Unclassified";

          return {
            id: String(exercise._id),
            title: exercise.name,
            subtitle: groups,
            tags: [archived ? "archived" : "active"],
            prompt: archived
              ? `restore exercise ${exercise.name}`
              : `show trend for ${exercise.name.toLowerCase()}`,
          };
        }),
      },
      {
        type: "suggestions",
        prompts: uniquePrompts([
          "rename exercise Push-ups to Push Ups",
          "delete exercise Push-ups",
          "restore exercise Push-ups",
          "set muscle groups for Push-ups: chest, triceps",
        ]),
      },
    ],
    outputForModel: {
      status: "ok",
      active_count: activeCount,
      archived_count: archivedCount,
      exercises: exercises.map((exercise) => ({
        id: String(exercise._id),
        name: exercise.name,
        archived: exercise.deletedAt !== undefined,
      })),
    },
  };
}
