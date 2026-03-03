import { BulkLogArgsSchema } from "./schemas";
import { runLogSetTool } from "./tool-log-set";
import type { CoachToolContext, ToolResult } from "./types";

export async function runBulkLogTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = BulkLogArgsSchema.parse(rawArgs);

  const results: ToolResult[] = [];
  for (const item of args.sets) {
    let result: ToolResult;
    try {
      result = await runLogSetTool(item, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result = {
        summary: `Failed to log set for ${item.exercise_name}.`,
        blocks: [
          {
            type: "status",
            tone: "error",
            title: "Couldn't log that set",
            description: message,
          },
        ],
        outputForModel: {
          status: "error",
          error: "bulk_log_item_failed",
          message,
        },
      };
    }
    results.push(result);
  }

  const successes = results.filter(
    (r) => r.outputForModel.status === "ok"
  ).length;
  const failures = results.length - successes;

  const summaryLine =
    failures === 0
      ? `Logged ${successes} set${successes === 1 ? "" : "s"}.`
      : `Logged ${successes} of ${results.length} sets (${failures} failed).`;

  return {
    summary: summaryLine,
    blocks: [
      {
        type: "status",
        tone: failures === 0 ? "success" : "info",
        title: failures === 0 ? "All sets logged" : "Bulk log partial",
        description: summaryLine,
      },
      ...results.flatMap((r) => r.blocks),
    ],
    outputForModel: {
      status: failures === 0 ? "ok" : "partial",
      logged: successes,
      failed: failures,
      results: results.map((r) => r.outputForModel),
    },
  };
}
