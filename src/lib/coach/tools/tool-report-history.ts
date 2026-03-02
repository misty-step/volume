import { format } from "date-fns";
import { api } from "@/../convex/_generated/api";
import { ReportHistoryArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

function formatWithOffset(ms: number, offset: number) {
  return format(new Date(ms - offset * 60_000), "MMM d, yyyy p");
}

type ReportRecord = {
  _id: string;
  reportType?: "daily" | "weekly" | "monthly";
  generatedAt: number;
  reportVersion?: string;
  model: string;
};

export async function runReportHistoryTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = ReportHistoryArgsSchema.parse(rawArgs);
  const limit = args.limit ?? 8;

  const reports = (await ctx.convex.query(api.ai.reports.getReportHistory, {
    limit,
  })) as ReportRecord[];

  return {
    summary: `Loaded ${reports.length} reports.`,
    blocks: [
      {
        type: "entity_list",
        title: "AI report history",
        emptyLabel: "No reports generated yet.",
        items: reports.map((report) => ({
          id: String(report._id),
          title: `${(report.reportType ?? "weekly").toUpperCase()} report`,
          subtitle: formatWithOffset(
            report.generatedAt,
            ctx.timezoneOffsetMinutes ?? 0
          ),
          meta: `model=${report.model}`,
          tags: [report.reportVersion ?? "1.0"],
          prompt: "show analytics overview",
        })),
      },
    ],
    outputForModel: {
      status: "ok",
      reports: reports.map((report) => ({
        id: String(report._id),
        type: report.reportType ?? "weekly",
        generated_at: report.generatedAt,
        model: report.model,
        version: report.reportVersion ?? "1.0",
      })),
    },
  };
}
