import { LogSetsArgsSchema } from "./schemas";
import { runBulkLogTool } from "./tool-bulk-log";
import { runLogSetTool } from "./tool-log-set";
import type { CoachToolContext, ToolResult } from "./types";

export async function runLogSetsTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = LogSetsArgsSchema.parse(rawArgs);

  switch (args.action) {
    case "log_set":
      return runLogSetTool(args.set, ctx);
    case "bulk_log":
      return runBulkLogTool({ sets: args.sets }, ctx);
  }
}
