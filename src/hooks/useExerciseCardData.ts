import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Set, WeightUnit } from "@/types/domain";
import type { Id } from "../../convex/_generated/dataModel";
import {
  buildExerciseSessions,
  computeSessionDelta,
  computeSetComparison,
  buildSparklineData,
  computeTrendDirection,
  type ExerciseSession,
  type SessionDelta,
  type SetComparison,
  type SparklineDataPoint,
} from "@/lib/exercise-insights";
import { checkForPR, type PRResult } from "@/lib/pr-detection";

/**
 * Enriched set with comparison and PR data for display.
 */
export interface EnrichedSet extends Set {
  /** Comparison to corresponding set from last session */
  comparison: SetComparison;
  /** Whether this set is a personal record */
  isPR: boolean;
  /** PR details if this set is a record */
  prResult: PRResult | null;
}

/**
 * Complete data for an exercise card with analytics.
 */
export interface ExerciseCardData {
  /** Loading state */
  isLoading: boolean;

  // === Collapsed state data ===
  /** Session delta vs last session */
  sessionDelta: SessionDelta | null;
  /** Whether any set in today's session is a PR */
  hasPR: boolean;
  /** Sparkline data for 6-8 session trend */
  sparklineData: SparklineDataPoint[];
  /** Overall trend direction */
  trendDirection: "up" | "down" | "flat";

  // === Expanded state data ===
  /** Sets enriched with comparison and PR data */
  enrichedSets: EnrichedSet[];
  /** Previous session for context */
  previousSession: ExerciseSession | null;

  // === Sessions for other uses ===
  /** All sessions for this exercise */
  sessions: ExerciseSession[];
}

/**
 * Hook to fetch and compute all analytics data for an exercise card.
 *
 * Provides:
 * - Session delta (volume/reps/duration change vs last session)
 * - PR detection (any set that beats all-time record)
 * - Sparkline data for trend visualization
 * - Set-by-set comparisons (ghost data, quality indicators)
 *
 * @param exerciseId - The exercise to fetch data for
 * @param todaysSets - Today's sets for this exercise (from GroupedSetHistory)
 * @param preferredUnit - User's preferred weight unit
 */
export function useExerciseCardData(
  exerciseId: string | null,
  todaysSets: Set[],
  preferredUnit: WeightUnit
): ExerciseCardData {
  // Fetch all sets for this exercise (for history + PR detection)
  const allSets = useQuery(
    api.sets.listSets,
    exerciseId ? { exerciseId: exerciseId as Id<"exercises"> } : "skip"
  );

  const isLoading = allSets === undefined;

  // Build sessions from all historical sets
  const sessions = useMemo(() => {
    if (!allSets || allSets.length === 0) return [];
    return buildExerciseSessions(allSets, preferredUnit);
  }, [allSets, preferredUnit]);

  // Get today's session and previous session
  const { todaysSession, previousSession } = useMemo(() => {
    if (sessions.length === 0) {
      return { todaysSession: null, previousSession: null };
    }

    const today = new Date().toDateString();
    const todaysSession = sessions.find((s) => s.dayKey === today) || null;

    // Previous session is the first session that isn't today
    const previousSession = sessions.find((s) => s.dayKey !== today) || null;

    return { todaysSession, previousSession };
  }, [sessions]);

  // Compute session delta
  const sessionDelta = useMemo(() => {
    if (!todaysSession) return null;
    return computeSessionDelta(todaysSession, previousSession, preferredUnit);
  }, [todaysSession, previousSession, preferredUnit]);

  // Build sparkline data
  const sparklineData = useMemo(() => {
    // Exclude today's session from sparkline (show historical trend)
    const historicalSessions = sessions.filter(
      (s) => s.dayKey !== new Date().toDateString()
    );
    return buildSparklineData(historicalSessions, 6);
  }, [sessions]);

  // Compute trend direction
  const trendDirection = useMemo(() => {
    return computeTrendDirection(sparklineData);
  }, [sparklineData]);

  // Enrich sets with comparison and PR data
  const enrichedSets = useMemo((): EnrichedSet[] => {
    if (!allSets) return [];

    // Sort today's sets oldest first for proper indexing
    const sortedTodaysSets = [...todaysSets].sort(
      (a, b) => a.performedAt - b.performedAt
    );

    // All sets BEFORE today for PR comparison
    const today = new Date().toDateString();
    const setsBeforeToday = allSets.filter(
      (s) => new Date(s.performedAt).toDateString() !== today
    );

    return sortedTodaysSets.map((set, index): EnrichedSet => {
      // Comparison to previous session's corresponding set
      const comparison = computeSetComparison(set, index, previousSession);

      // Check if this set is a PR (compare against all sets before today)
      const prResult = checkForPR(set, setsBeforeToday);
      const isPR = prResult !== null;

      return {
        ...set,
        comparison,
        isPR,
        prResult,
      };
    });
  }, [allSets, todaysSets, previousSession]);

  // Check if any set in today's session is a PR
  const hasPR = useMemo(() => {
    return enrichedSets.some((s) => s.isPR);
  }, [enrichedSets]);

  return {
    isLoading,
    sessionDelta,
    hasPR,
    sparklineData,
    trendDirection,
    enrichedSets,
    previousSession,
    sessions,
  };
}
