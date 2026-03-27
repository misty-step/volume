import { GetInsightsArgsSchema } from "./schemas";
import { runAnalyticsOverviewTool } from "./tool-analytics-overview";
import { runFocusSuggestionsTool } from "./tool-focus-suggestions";
import type { CoachToolContext, ToolResult } from "./types";

export async function runGetInsightsTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = GetInsightsArgsSchema.parse(rawArgs);

  switch (args.action) {
    case "analytics_overview":
      return runAnalyticsOverviewTool(ctx);
    case "focus_suggestions":
      return runFocusSuggestionsTool(ctx);
  }
}
