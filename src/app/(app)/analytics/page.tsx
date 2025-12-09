"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PageLayout } from "@/components/layout/page-layout";
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import { PRCard } from "@/components/analytics/pr-card";
import { QuickStatsBar } from "@/components/analytics/quick-stats-bar";
import { ReportNavigator } from "@/components/analytics/report-navigator";
import { ProgressiveOverloadWidget } from "@/components/analytics/progressive-overload-widget";
import { RecoveryDashboardWidget } from "@/components/analytics/recovery-dashboard-widget";
import { FocusSuggestionsWidget } from "@/components/analytics/focus-suggestions-widget";
import { Dumbbell } from "lucide-react";
import {
  filterFrequencyFromFirstWorkout,
  type WorkoutFrequency,
} from "@/lib/analytics-utils";

/**
 * Analytics Page
 *
 * Uses composite query for 85% reduction in DB reads.
 * Mobile-first layout with progressive disclosure.
 */
export default function AnalyticsPage() {
  // Single composite query - replaces 4+ individual queries
  const dashboard = useQuery(api.analytics.getDashboardAnalytics, {});

  // Filter heatmap to start at first workout (not Jan 1st)
  const filteredFrequencyData = useMemo(() => {
    const frequency = dashboard?.frequency ?? [];
    const firstWorkoutDate = dashboard?.firstWorkoutDate ?? null;
    return filterFrequencyFromFirstWorkout(frequency, firstWorkoutDate);
  }, [dashboard?.frequency, dashboard?.firstWorkoutDate]);

  const isLoading = dashboard === undefined;

  // Count days with workout activity for new user detection
  const workoutDaysCount = dashboard?.frequency
    ? dashboard.frequency.filter((day: WorkoutFrequency) => day.setCount > 0)
        .length
    : 0;

  // Show empty state for users with <7 days of data
  const isNewUser = !isLoading && workoutDaysCount < 7;

  // Empty state for new users
  if (isNewUser) {
    return (
      <PageLayout title="Your Analytics">
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Track your progress and celebrate wins
          </p>

          {/* New User Onboarding */}
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Dumbbell className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Welcome to Analytics!
            </h2>
            <p className="text-muted-foreground mb-4 max-w-md">
              Log 7 days of workouts to unlock detailed analytics and insights.
            </p>
            <p className="text-sm text-muted-foreground italic">
              Every champion started somewhere. Keep going!
            </p>
            {workoutDaysCount > 0 && (
              <div className="mt-6 p-4 bg-muted/50 border-2 border-border">
                <p className="text-sm font-medium font-mono uppercase">
                  Progress: {workoutDaysCount} / 7 days
                </p>
                <div className="mt-2 w-48 h-2 bg-muted border-2 border-border overflow-hidden">
                  <div
                    className="h-full bg-safety-orange transition-all"
                    style={{ width: `${(workoutDaysCount / 7) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Show partial data if available */}
          {workoutDaysCount > 0 && dashboard && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Here&apos;s what we have so far:
              </p>
              <QuickStatsBar
                streakStats={dashboard.streakStats}
                recentPRs={dashboard.recentPRs}
                isLoading={false}
              />
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Your Analytics" maxWidth={false}>
      <p className="text-sm text-muted-foreground mb-6">
        Track your progress and celebrate wins
      </p>

      {/* Mobile-first single column, wider on desktop */}
      <div className="space-y-6">
        {/* Quick Stats - Hero metrics at a glance */}
        <QuickStatsBar
          streakStats={
            dashboard?.streakStats ?? {
              currentStreak: 0,
              longestStreak: 0,
              totalWorkouts: 0,
            }
          }
          recentPRs={dashboard?.recentPRs ?? []}
          isLoading={isLoading}
        />

        {/* Activity Heatmap - Full width */}
        <ActivityHeatmap data={filteredFrequencyData} isLoading={isLoading} />

        {/* AI Reports */}
        <ReportNavigator />

        {/* Two-column grid on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Focus Suggestions */}
          <FocusSuggestionsWidget isLoading={isLoading} />

          {/* Recovery Dashboard */}
          <RecoveryDashboardWidget isLoading={isLoading} />
        </div>

        {/* Progressive Overload - Full width (charts need space) */}
        <ProgressiveOverloadWidget isLoading={isLoading} />

        {/* PRs Card */}
        <PRCard prs={dashboard?.recentPRs ?? []} isLoading={isLoading} />
      </div>
    </PageLayout>
  );
}
