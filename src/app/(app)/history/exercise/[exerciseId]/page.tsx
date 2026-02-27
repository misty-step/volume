"use client";

import { use, useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { type Id } from "../../../../../../convex/_generated/dataModel";
import { PageLayout } from "@/components/layout/page-layout";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Calendar, Dumbbell, Timer } from "lucide-react";
import {
  buildExerciseSessions,
  computeTrendSummary,
  buildWeightTierBreakdown,
  getRecentSessions,
} from "@/lib/exercise-insights";
import { formatNumber } from "@/lib/number-utils";
import { formatDuration } from "@/lib/date-utils";
import { trackEvent } from "@/lib/analytics";

// Compute date range outside component to avoid impure function warnings
function getDateRange() {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return { startDate: thirtyDaysAgo.getTime(), endDate: now };
}

interface ExerciseDetailPageProps {
  params: Promise<{ exerciseId: string }>;
}

export default function ExerciseDetailPage({
  params,
}: ExerciseDetailPageProps) {
  const { exerciseId } = use(params);
  const { unit: preferredUnit } = useWeightUnit();

  // Fetch exercise details
  const exercise = useQuery(api.exercises.getExercise, {
    id: exerciseId as Id<"exercises">,
  });

  // Fetch all-time stats
  const allTimeStats = useQuery(api.sets.getExerciseAllTimeStats, {
    exerciseId: exerciseId as Id<"exercises">,
  });

  // Fetch recent sets (last 30 days worth)
  // Use useState with lazy init to avoid impure function warning in useMemo
  const [dateRange] = useState(getDateRange);

  const recentSets = useQuery(api.sets.listSetsForExerciseDateRange, {
    exerciseId: exerciseId as Id<"exercises">,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Build sessions and trends
  const sessions = useMemo(
    () => buildExerciseSessions(recentSets ?? [], preferredUnit),
    [recentSets, preferredUnit]
  );

  const recentSessions = useMemo(
    () => getRecentSessions(sessions, 7),
    [sessions]
  );

  const trendSummary = useMemo(
    () => computeTrendSummary(recentSessions, "Last 7 sessions"),
    [recentSessions]
  );

  const _thirtyDayTrend = useMemo(
    () => computeTrendSummary(sessions, "Last 30 days"),
    [sessions]
  );

  // Weight tier breakdown for most recent session
  const latestSessionTiers = useMemo(() => {
    if (sessions.length === 0) return [];
    return buildWeightTierBreakdown(sessions[0]!.sets, preferredUnit);
  }, [sessions, preferredUnit]);

  // Track exercise detail view once per mount
  const hasTracked = useRef(false);
  useEffect(() => {
    if (exercise && !hasTracked.current) {
      hasTracked.current = true;
      trackEvent("Exercise Detail Viewed", { exerciseId });
    }
  }, [exercise, exerciseId]);

  // Loading state
  if (exercise === undefined || allTimeStats === undefined) {
    return (
      <PageLayout title="Exercise">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-concrete-gray/20 animate-pulse" />
          <div className="h-32 bg-concrete-gray/20 animate-pulse" />
          <div className="h-32 bg-concrete-gray/20 animate-pulse" />
        </div>
      </PageLayout>
    );
  }

  // Exercise not found
  if (exercise === null) {
    return (
      <PageLayout title="Exercise">
        <div className="border-3 border-border p-12 text-center">
          <p className="text-muted-foreground text-sm mb-2 font-mono uppercase tracking-wide">
            Exercise not found
          </p>
          <p className="text-sm mb-4">
            This exercise may have been deleted or doesn&apos;t exist.
          </p>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 text-danger-red hover:underline font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </Link>
        </div>
      </PageLayout>
    );
  }

  // Determine exercise type
  const isWeighted = (allTimeStats?.bestWeightSet?.weight ?? 0) > 0;
  const isDuration = (allTimeStats?.totalDuration ?? 0) > 0;

  return (
    <PageLayout>
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/history"
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight uppercase">
          {exercise.name}
        </h1>
      </div>
      <div className="space-y-4">
        {/* All-Time Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              All Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatBlock
                label="Total Sessions"
                value={formatNumber(allTimeStats?.uniqueDays ?? 0)}
              />
              <StatBlock
                label="Total Sets"
                value={formatNumber(allTimeStats?.totalSets ?? 0)}
              />
              {!isDuration && (
                <StatBlock
                  label="Total Reps"
                  value={formatNumber(allTimeStats?.totalReps ?? 0)}
                />
              )}
              {isDuration && (
                <StatBlock
                  label="Total Time"
                  value={formatDuration(allTimeStats?.totalDuration ?? 0)}
                />
              )}
              {isWeighted && allTimeStats?.bestWeightSet && (
                <StatBlock
                  label="Best Weight"
                  value={`${allTimeStats.bestWeightSet.weight} ${allTimeStats.bestWeightSet.unit ?? preferredUnit}`}
                  highlight
                />
              )}
              {!isWeighted && !isDuration && allTimeStats?.bestRepSet && (
                <StatBlock
                  label="Best Set"
                  value={`${allTimeStats.bestRepSet.reps} reps`}
                  highlight
                />
              )}
              {isDuration && allTimeStats?.bestDurationSet && (
                <StatBlock
                  label="Longest"
                  value={formatDuration(
                    allTimeStats.bestDurationSet.duration ?? 0
                  )}
                  highlight
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Trend */}
        {trendSummary.sessionCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {trendSummary.windowLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBlock
                  label="Sessions"
                  value={formatNumber(trendSummary.sessionCount)}
                />
                {trendSummary.setsPerSessionAvg !== null && (
                  <StatBlock
                    label="Sets/Session"
                    value={trendSummary.setsPerSessionAvg.toFixed(1)}
                  />
                )}
                {trendSummary.workingWeight !== null && (
                  <StatBlock
                    label="Working Weight"
                    value={`${Math.round(trendSummary.workingWeight)} ${preferredUnit}`}
                    icon={<Dumbbell className="w-3 h-3" />}
                  />
                )}
                {trendSummary.volumePerSessionAvg !== null && (
                  <StatBlock
                    label="Avg Volume"
                    value={`${formatNumber(Math.round(trendSummary.volumePerSessionAvg))} ${preferredUnit}`}
                  />
                )}
                {trendSummary.frequencyThisWeek !== null && (
                  <StatBlock
                    label="This Week"
                    value={`${trendSummary.frequencyThisWeek}x`}
                    subValue={
                      trendSummary.frequencyLastWeek !== null
                        ? `vs ${trendSummary.frequencyLastWeek}x last`
                        : undefined
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weight Tier Breakdown (latest session) */}
        {latestSessionTiers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Latest Session Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {latestSessionTiers.map((tier) => (
                  <div
                    key={tier.weight}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="font-mono font-bold">
                      {tier.weight} {tier.unit}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {tier.setCount} set{tier.setCount === 1 ? "" : "s"} (avg{" "}
                      {tier.avgReps} reps)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Sessions List */}
        {sessions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 10).map((session) => (
                  <div
                    key={session.dayKey}
                    className="py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{session.displayDate}</span>
                      <span className="text-muted-foreground text-sm">
                        {session.totals.setCount} set
                        {session.totals.setCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                      {session.totals.volume > 0 && (
                        <span>
                          {formatNumber(Math.round(session.totals.volume))}{" "}
                          {preferredUnit}
                        </span>
                      )}
                      {session.totals.volume === 0 &&
                        session.totals.reps > 0 && (
                          <span>{formatNumber(session.totals.reps)} reps</span>
                        )}
                      {session.totals.durationSec > 0 && (
                        <span>
                          {formatDuration(session.totals.durationSec)}
                        </span>
                      )}
                      {session.maxWeight !== null && (
                        <span className="text-danger-red">
                          Max: {Math.round(session.maxWeight)} {preferredUnit}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state for new exercises */}
        {sessions.length === 0 && allTimeStats?.totalSets === 0 && (
          <div className="border-3 border-border p-12 text-center">
            <p className="text-muted-foreground text-sm mb-2 font-mono uppercase tracking-wide">
              No sets logged yet
            </p>
            <p className="text-sm">
              Start logging sets for {exercise.name} to see trends!
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

interface StatBlockProps {
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}

function StatBlock({
  label,
  value,
  subValue,
  highlight,
  icon,
}: StatBlockProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div
        className={`text-lg font-bold tabular-nums ${highlight ? "text-danger-red" : ""}`}
      >
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-muted-foreground">{subValue}</div>
      )}
    </div>
  );
}
