import { api } from "@/../convex/_generated/api";
import type { CoachToolContext, ToolResult } from "./types";

type DashboardAnalytics = {
  frequency: Array<{ date: string; setCount: number; totalVolume: number }>;
  streakStats: {
    currentStreak: number;
    longestStreak: number;
    totalWorkouts: number;
  };
  recentPRs: Array<{
    exerciseName: string;
    prType: string;
    improvement: number;
    performedAt: number;
  }>;
  focusSuggestions: Array<{
    title: string;
    priority: "high" | "medium" | "low";
    reason: string;
  }>;
  progressiveOverload: Array<{
    exerciseName: string;
    trend: "improving" | "plateau" | "declining";
  }>;
};

function trendTag(trend: "improving" | "plateau" | "declining"): string {
  if (trend === "improving") return "improving";
  if (trend === "declining") return "watch";
  return "plateau";
}

export async function runAnalyticsOverviewTool(
  ctx: CoachToolContext
): Promise<ToolResult> {
  const dashboard = (await ctx.convex.query(
    api.analytics.getDashboardAnalytics,
    {}
  )) as DashboardAnalytics;

  const workoutDays = dashboard.frequency.filter(
    (day) => day.setCount > 0
  ).length;
  const latestDays = dashboard.frequency.slice(-14);
  const recentVolume = latestDays.reduce(
    (sum, day) => sum + day.totalVolume,
    0
  );

  return {
    summary: "Prepared analytics overview.",
    blocks: [
      {
        type: "metrics",
        title: "Analytics overview",
        metrics: [
          {
            label: "Current streak",
            value: String(dashboard.streakStats.currentStreak),
          },
          {
            label: "Longest streak",
            value: String(dashboard.streakStats.longestStreak),
          },
          {
            label: "Workout days",
            value: String(workoutDays),
          },
          {
            label: "14d volume",
            value: String(Math.round(recentVolume)),
          },
        ],
      },
      {
        type: "entity_list",
        title: "Recent PRs",
        emptyLabel: "No PRs yet. Keep logging consistent sets.",
        items: dashboard.recentPRs.slice(0, 8).map((pr) => ({
          title: pr.exerciseName,
          subtitle: `${pr.prType} (+${Math.round(pr.improvement)})`,
          prompt: `show trend for ${pr.exerciseName.toLowerCase()}`,
        })),
      },
      {
        type: "entity_list",
        title: "Progressive overload",
        emptyLabel: "Not enough recent data yet.",
        items: dashboard.progressiveOverload.map((entry) => ({
          title: entry.exerciseName,
          subtitle: `Trend: ${entry.trend}`,
          tags: [trendTag(entry.trend)],
          prompt: `show trend for ${entry.exerciseName.toLowerCase()}`,
        })),
      },
      {
        type: "table",
        title: "Focus suggestions",
        rows: dashboard.focusSuggestions.slice(0, 6).map((suggestion) => ({
          label: suggestion.title,
          value: suggestion.priority.toUpperCase(),
          meta: suggestion.reason,
        })),
      },
    ],
    outputForModel: {
      status: "ok",
      current_streak: dashboard.streakStats.currentStreak,
      longest_streak: dashboard.streakStats.longestStreak,
      workout_days: workoutDays,
      recent_pr_count: dashboard.recentPRs.length,
      focus_suggestion_count: dashboard.focusSuggestions.length,
    },
  };
}
