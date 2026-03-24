import { QueryWorkoutsArgsSchema } from "./schemas";
import { runDateRangeSetsTool } from "./tool-date-range-sets";
import { runHistoryOverviewTool } from "./tool-history-overview";
import { runTodaySummaryTool } from "./tool-today-summary";
import { runWorkoutSessionTool } from "./tool-workout-session";
import type { CoachToolContext, ToolResult } from "./types";

export async function runQueryWorkoutsTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = QueryWorkoutsArgsSchema.parse(rawArgs);

  switch (args.action) {
    case "today_summary":
      return runTodaySummaryTool(ctx);
    case "workout_session":
      return runWorkoutSessionTool({ date: args.date }, ctx);
    case "date_range":
      return runDateRangeSetsTool(
        {
          start_date: args.start_date,
          end_date: args.end_date,
        },
        ctx
      );
    case "history_overview":
      return runHistoryOverviewTool({ limit: args.limit }, ctx);
    default: {
      const _exhaustive: never = args;
      throw new Error(
        `Unhandled query_workouts action: ${String(_exhaustive)}`
      );
    }
  }
}
