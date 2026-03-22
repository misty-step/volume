import { ModifySetArgsSchema } from "./schemas";
import { runDeleteSetTool } from "./tool-delete-set";
import { runEditSetTool } from "./tool-edit-set";
import type { CoachToolContext, ToolResult } from "./types";

export async function runModifySetTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = ModifySetArgsSchema.parse(rawArgs);

  switch (args.action) {
    case "edit":
      return runEditSetTool(
        {
          set_id: args.set_id,
          reps: args.reps,
          duration_seconds: args.duration_seconds,
          weight: args.weight,
          unit: args.unit,
        },
        ctx
      );
    case "delete":
      return runDeleteSetTool(
        {
          set_id: args.set_id,
          exercise_name: args.exercise_name,
        },
        ctx
      );
  }
}
