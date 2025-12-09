"use client";

import { Flame, Dumbbell, Trophy } from "lucide-react";
import type { StreakStats, RecentPR } from "../../../convex/analytics";

interface QuickStatsBarProps {
  streakStats: StreakStats;
  recentPRs: RecentPR[];
  isLoading?: boolean;
}

/**
 * Quick Stats Bar
 *
 * Compact horizontal strip showing key metrics at a glance.
 * Don Norman: "Recognition over recall" - instant comprehension.
 * Kenya Hara: "Emptiness is potential" - only essential data.
 */
export function QuickStatsBar({
  streakStats,
  recentPRs,
  isLoading = false,
}: QuickStatsBarProps) {
  // Count PRs from this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prsThisMonth = recentPRs.filter(
    (pr) => pr.performedAt >= startOfMonth
  ).length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse p-4 border-3 border-border bg-muted/30"
          >
            <div className="h-4 bg-muted w-16 mb-2" />
            <div className="h-8 bg-muted w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Current Streak */}
      <div className="p-4 border-3 border-border bg-card">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Flame
            className={`w-4 h-4 ${streakStats.currentStreak > 0 ? "text-safety-orange" : ""}`}
          />
          <span className="font-mono uppercase tracking-wide">Streak</span>
        </div>
        <div className="font-mono text-2xl font-bold tabular-nums">
          {streakStats.currentStreak}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            day{streakStats.currentStreak !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Total Workouts */}
      <div className="p-4 border-3 border-border bg-card">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Dumbbell className="w-4 h-4" />
          <span className="font-mono uppercase tracking-wide">Workouts</span>
        </div>
        <div className="font-mono text-2xl font-bold tabular-nums">
          {streakStats.totalWorkouts}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            total
          </span>
        </div>
      </div>

      {/* PRs This Month */}
      <div className="p-4 border-3 border-border bg-card">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Trophy
            className={`w-4 h-4 ${prsThisMonth > 0 ? "text-safety-orange" : ""}`}
          />
          <span className="font-mono uppercase tracking-wide">PRs</span>
        </div>
        <div className="font-mono text-2xl font-bold tabular-nums">
          {prsThisMonth}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            this month
          </span>
        </div>
      </div>
    </div>
  );
}
