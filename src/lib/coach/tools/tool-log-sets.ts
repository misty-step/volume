import { LogSetsArgsSchema } from "./schemas";
import { runBulkLogTool } from "./tool-bulk-log";
import { runLogSetTool } from "./tool-log-set";
import type { CoachToolContext, ToolResult } from "./types";

export async function runLogSetsTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = LogSetsArgsSchema.parse(rawArgs);

  if (args.sets.length === 1) {
    return runLogSetTool(args.sets[0], ctx);
  }

  return runBulkLogTool(args, ctx);
}
