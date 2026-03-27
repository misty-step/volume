import { QueryExerciseArgsSchema } from "./schemas";
import { runExerciseHistoryTool } from "./tool-exercise-history";
import {
  runExerciseSnapshotTool,
  runExerciseTrendTool,
} from "./tool-exercise-report";
import type { CoachToolContext, ToolResult } from "./types";

export async function runQueryExerciseTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = QueryExerciseArgsSchema.parse(rawArgs);

  switch (args.action) {
    case "snapshot":
      return runExerciseSnapshotTool(
        { exercise_name: args.exercise_name },
        ctx
      );
    case "trend":
      return runExerciseTrendTool({ exercise_name: args.exercise_name }, ctx);
    case "history":
      return runExerciseHistoryTool(
        {
          exercise_name: args.exercise_name,
          limit: args.limit,
        },
        ctx
      );
    default: {
      const _exhaustive: never = args;
      throw new Error(
        `Unhandled query_exercise action: ${String(_exhaustive)}`
      );
    }
  }
}
