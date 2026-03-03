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
    const result = await runLogSetTool(item, ctx);
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
