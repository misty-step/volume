"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageLayout } from "@/components/layout/page-layout";
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import { PRCard } from "@/components/analytics/pr-card";
import { StreakCard } from "@/components/analytics/streak-card";
import { ReportNavigator } from "@/components/analytics/report-navigator";
import { ProgressiveOverloadWidget } from "@/components/analytics/progressive-overload-widget";
import { RecoveryDashboardWidget } from "@/components/analytics/recovery-dashboard-widget";
import { FocusSuggestionsWidget } from "@/components/analytics/focus-suggestions-widget";
import { Dumbbell } from "lucide-react";

export default function AnalyticsPage() {
  // Fetch analytics data using Convex queries
  const frequencyData = useQuery(api.analytics.getWorkoutFrequency, {
    days: 365,
  });
  const streakStats = useQuery(api.analytics.getStreakStats, {});
  const recentPRs = useQuery(api.analytics.getRecentPRs, { days: 30 });
  const firstWorkoutDate = useQuery(api.users.getFirstWorkoutDate, {});

  // Filter heatmap data to start at first workout date (not Jan 1st)
  const filteredFrequencyData = useMemo(() => {
    if (!frequencyData || !firstWorkoutDate) return frequencyData;
    return frequencyData.filter((day: any) => day.date >= firstWorkoutDate);
  }, [frequencyData, firstWorkoutDate]);

  // Determine loading state (any query undefined = still loading)
  const isLoading =
    frequencyData === undefined ||
    streakStats === undefined ||
    recentPRs === undefined;

  // Count days with workout activity for new user detection
  const workoutDaysCount = frequencyData
    ? frequencyData.filter((day: any) => day.setCount > 0).length
    : 0;

  // Show empty state for users with <7 days of data
  const isNewUser = !isLoading && workoutDaysCount < 7;

  // Empty state for new users
  if (isNewUser) {
    return (
      <PageLayout title="Your Analytics">
        <div className="space-y-6">
          {/* Page description */}
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
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">
                  Progress: {workoutDaysCount} / 7 days
                </p>
                <div className="mt-2 w-48 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${(workoutDaysCount / 7) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Show partial data if available (progressive disclosure) */}
          {workoutDaysCount > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Here&apos;s what we have so far:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StreakCard
                  currentStreak={streakStats?.currentStreak || 0}
                  longestStreak={streakStats?.longestStreak || 0}
                  totalWorkouts={streakStats?.totalWorkouts || 0}
                  isLoading={false}
                />
              </div>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Your Analytics" maxWidth={false}>
      {/* Page description */}
      <p className="text-sm text-muted-foreground mb-6">
        Track your progress and celebrate wins
      </p>

      {/* Dashboard Grid - 12-column responsive layout */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Row 1: AI Insights with Report Navigation - 12 cols full width */}
        <div className="md:col-span-6 lg:col-span-12">
          <ReportNavigator />
        </div>

        {/* Row 2: Activity Heatmap - 12 cols full width (moved up from Row 3) */}
        <div className="md:col-span-6 lg:col-span-12">
          <ActivityHeatmap
            data={filteredFrequencyData || []}
            isLoading={isLoading}
          />
        </div>

        {/* Row 3: Focus Suggestions (4) | Progressive Overload (8) */}
        <div className="md:col-span-3 lg:col-span-4">
          <FocusSuggestionsWidget isLoading={isLoading} />
        </div>
        <div className="md:col-span-3 lg:col-span-8">
          <ProgressiveOverloadWidget isLoading={isLoading} />
        </div>

        {/* Row 4: Recovery Dashboard (6) | Streak + PRs stacked (6) */}
        <div className="md:col-span-3 lg:col-span-6">
          <RecoveryDashboardWidget isLoading={isLoading} />
        </div>
        <div className="md:col-span-3 lg:col-span-6 space-y-4">
          <StreakCard
            currentStreak={streakStats?.currentStreak || 0}
            longestStreak={streakStats?.longestStreak || 0}
            totalWorkouts={streakStats?.totalWorkouts || 0}
            isLoading={isLoading}
          />
          <PRCard prs={recentPRs || []} isLoading={isLoading} />
        </div>
      </div>
    </PageLayout>
  );
}
