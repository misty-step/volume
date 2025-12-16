import { WeightUnit, Set } from "@/types/domain";
import { convertWeight, normalizeWeightUnit } from "./weight-utils";
import { formatDateGroup } from "./date-formatters";

/**
 * Represents a single workout session for an exercise (one calendar day).
 */
export interface ExerciseSession {
  /** Date key in toDateString() format */
  dayKey: string;
  /** Human-friendly date display */
  displayDate: string;
  /** Sets in this session, newest first */
  sets: Set[];
  /** Session totals */
  totals: {
    setCount: number;
    reps: number;
    durationSec: number;
    volume: number;
  };
  /** Best set in this session */
  bestSet: {
    reps?: number;
    weight?: number;
    duration?: number;
    performedAt: number;
  } | null;
  /** Max weight used in this session (working weight heuristic) */
  maxWeight: number | null;
}

/**
 * Trend summary for a time window.
 */
export interface ExerciseTrendSummary {
  windowLabel: "Last 7 sessions" | "Last 30 days" | "All time";
  sessionCount: number;
  setsPerSessionAvg: number | null;
  repsPerSetAvg: number | null;
  workingWeight: number | null; // Max weight across sessions
  volumePerSessionAvg: number | null;
  bestSet: {
    reps?: number;
    weight?: number;
    duration?: number;
    performedAt: number;
  } | null;
  frequencyThisWeek: number | null;
  frequencyLastWeek: number | null;
}

/**
 * Weight tier breakdown (e.g., "135: 2 sets (avg 10 reps)").
 */
export interface WeightTierBreakdown {
  weight: number;
  unit: WeightUnit;
  setCount: number;
  avgReps: number;
}

/**
 * Build exercise sessions from sets (grouped by day).
 */
export function buildExerciseSessions(
  sets: Set[],
  preferredUnit: WeightUnit
): ExerciseSession[] {
  if (!sets || sets.length === 0) return [];

  const dayMap = new Map<string, Set[]>();
  const orderedDays: string[] = [];

  // Group by day
  for (const set of sets) {
    const dayKey = new Date(set.performedAt).toDateString();

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, []);
      orderedDays.push(dayKey);
    }

    dayMap.get(dayKey)!.push(set);
  }

  // Build sessions
  return orderedDays.map((dayKey): ExerciseSession => {
    const daySets = dayMap.get(dayKey)!;
    daySets.sort((a, b) => b.performedAt - a.performedAt);

    let reps = 0;
    let durationSec = 0;
    let volume = 0;
    let maxWeight: number | null = null;
    let bestSet: ExerciseSession["bestSet"] = null;
    let bestSetScore = -1;

    for (const set of daySets) {
      if (set.reps !== undefined) {
        reps += set.reps;

        if (set.weight !== undefined) {
          const setUnit = normalizeWeightUnit(set.unit);
          const convertedWeight = convertWeight(
            set.weight,
            setUnit,
            preferredUnit
          );
          volume += set.reps * convertedWeight;

          if (maxWeight === null || convertedWeight > maxWeight) {
            maxWeight = convertedWeight;
          }

          // Best set = highest volume single set
          const setVolume = set.reps * convertedWeight;
          if (setVolume > bestSetScore) {
            bestSetScore = setVolume;
            bestSet = {
              reps: set.reps,
              weight: set.weight,
              performedAt: set.performedAt,
            };
          }
        } else {
          // Bodyweight: best set = most reps
          if (set.reps > bestSetScore) {
            bestSetScore = set.reps;
            bestSet = {
              reps: set.reps,
              performedAt: set.performedAt,
            };
          }
        }
      }

      if (set.duration !== undefined) {
        durationSec += set.duration;

        // Duration: best set = longest duration
        if (set.duration > bestSetScore) {
          bestSetScore = set.duration;
          bestSet = {
            duration: set.duration,
            performedAt: set.performedAt,
          };
        }
      }
    }

    return {
      dayKey,
      displayDate: formatDateGroup(dayKey),
      sets: daySets,
      totals: {
        setCount: daySets.length,
        reps,
        durationSec,
        volume,
      },
      bestSet,
      maxWeight,
    };
  });
}

/**
 * Compute trend summary for a window of sessions.
 */
export function computeTrendSummary(
  sessions: ExerciseSession[],
  windowLabel: ExerciseTrendSummary["windowLabel"]
): ExerciseTrendSummary {
  if (sessions.length === 0) {
    return {
      windowLabel,
      sessionCount: 0,
      setsPerSessionAvg: null,
      repsPerSetAvg: null,
      workingWeight: null,
      volumePerSessionAvg: null,
      bestSet: null,
      frequencyThisWeek: null,
      frequencyLastWeek: null,
    };
  }

  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  let workingWeight: number | null = null;
  let bestSet: ExerciseTrendSummary["bestSet"] = null;
  let bestSetScore = -1;

  // Calculate week boundaries for frequency
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  let frequencyThisWeek = 0;
  let frequencyLastWeek = 0;

  for (const session of sessions) {
    totalSets += session.totals.setCount;
    totalReps += session.totals.reps;
    totalVolume += session.totals.volume;

    if (session.maxWeight !== null) {
      if (workingWeight === null || session.maxWeight > workingWeight) {
        workingWeight = session.maxWeight;
      }
    }

    // Track best set across all sessions
    if (session.bestSet) {
      let score = 0;
      if (
        session.bestSet.weight !== undefined &&
        session.bestSet.reps !== undefined
      ) {
        score = session.bestSet.weight * session.bestSet.reps;
      } else if (session.bestSet.reps !== undefined) {
        score = session.bestSet.reps;
      } else if (session.bestSet.duration !== undefined) {
        score = session.bestSet.duration;
      }

      if (score > bestSetScore) {
        bestSetScore = score;
        bestSet = session.bestSet;
      }
    }

    // Frequency tracking
    const sessionDate = new Date(session.dayKey);
    if (sessionDate >= startOfThisWeek) {
      frequencyThisWeek++;
    } else if (sessionDate >= startOfLastWeek) {
      frequencyLastWeek++;
    }
  }

  const sessionCount = sessions.length;

  return {
    windowLabel,
    sessionCount,
    setsPerSessionAvg: sessionCount > 0 ? totalSets / sessionCount : null,
    repsPerSetAvg: totalSets > 0 ? totalReps / totalSets : null,
    workingWeight,
    volumePerSessionAvg:
      sessionCount > 0 && totalVolume > 0 ? totalVolume / sessionCount : null,
    bestSet,
    frequencyThisWeek,
    frequencyLastWeek,
  };
}

/**
 * Build weight tier breakdown for a session.
 */
export function buildWeightTierBreakdown(
  sets: Set[],
  preferredUnit: WeightUnit,
  roundingStep: number = 5
): WeightTierBreakdown[] {
  const tiers = new Map<number, { totalReps: number; setCount: number }>();

  for (const set of sets) {
    if (set.weight === undefined || set.reps === undefined) continue;

    const setUnit = normalizeWeightUnit(set.unit);
    const convertedWeight = convertWeight(set.weight, setUnit, preferredUnit);

    // Round to nearest step
    const roundedWeight =
      Math.round(convertedWeight / roundingStep) * roundingStep;

    if (!tiers.has(roundedWeight)) {
      tiers.set(roundedWeight, { totalReps: 0, setCount: 0 });
    }

    const tier = tiers.get(roundedWeight)!;
    tier.totalReps += set.reps;
    tier.setCount++;
  }

  // Sort by weight descending (heaviest first)
  return Array.from(tiers.entries())
    .map(([weight, data]) => ({
      weight,
      unit: preferredUnit,
      setCount: data.setCount,
      avgReps: Math.round(data.totalReps / data.setCount),
    }))
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Get recent N sessions from a list.
 */
export function getRecentSessions(
  sessions: ExerciseSession[],
  count: number
): ExerciseSession[] {
  return sessions.slice(0, count);
}

/**
 * Get sessions within a date range.
 */
export function getSessionsInDateRange(
  sessions: ExerciseSession[],
  startDate: Date,
  endDate: Date
): ExerciseSession[] {
  return sessions.filter((session) => {
    const sessionDate = new Date(session.dayKey);
    return sessionDate >= startDate && sessionDate <= endDate;
  });
}

/**
 * Session delta result for comparing current vs previous session.
 */
export interface SessionDelta {
  /** Absolute difference in metric value */
  value: number;
  /** Unit for display (lbs, reps, etc) */
  unit: string;
  /** Direction of change */
  direction: "up" | "down" | "same";
  /** Percentage change from previous */
  percentChange: number | null;
}

/**
 * Compute delta between current and previous session.
 *
 * Compares volume for weighted exercises, reps for bodyweight, duration for timed.
 */
export function computeSessionDelta(
  currentSession: ExerciseSession,
  previousSession: ExerciseSession | null,
  preferredUnit: WeightUnit
): SessionDelta | null {
  if (!previousSession) {
    return null;
  }

  const current = currentSession.totals;
  const previous = previousSession.totals;

  // Determine primary metric based on what data exists
  // Priority: volume > reps > duration
  if (current.volume > 0 && previous.volume > 0) {
    const diff = current.volume - previous.volume;
    const percentChange =
      previous.volume > 0 ? (diff / previous.volume) * 100 : null;
    return {
      value: Math.abs(Math.round(diff)),
      unit: preferredUnit,
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
      percentChange: percentChange !== null ? Math.round(percentChange) : null,
    };
  }

  if (current.reps > 0 && previous.reps > 0) {
    const diff = current.reps - previous.reps;
    const percentChange =
      previous.reps > 0 ? (diff / previous.reps) * 100 : null;
    return {
      value: Math.abs(diff),
      unit: "reps",
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
      percentChange: percentChange !== null ? Math.round(percentChange) : null,
    };
  }

  if (current.durationSec > 0 && previous.durationSec > 0) {
    const diff = current.durationSec - previous.durationSec;
    const percentChange =
      previous.durationSec > 0 ? (diff / previous.durationSec) * 100 : null;
    return {
      value: Math.abs(diff),
      unit: "sec",
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
      percentChange: percentChange !== null ? Math.round(percentChange) : null,
    };
  }

  return null;
}

/**
 * Set comparison result for ghost data display.
 */
export interface SetComparison {
  /** Reps from the corresponding set in last session */
  lastReps: number | null;
  /** Weight from the corresponding set in last session */
  lastWeight: number | null;
  /** Duration from the corresponding set in last session */
  lastDuration: number | null;
  /** Quality indicator based on comparison */
  quality: "beat" | "matched" | "under" | null;
}

/**
 * Compare a set to the corresponding set from previous session.
 *
 * For set N in today's workout, compare to set N from last session.
 * If last session had fewer sets, returns null values.
 */
export function computeSetComparison(
  currentSet: Set,
  setIndex: number,
  previousSession: ExerciseSession | null
): SetComparison {
  const result: SetComparison = {
    lastReps: null,
    lastWeight: null,
    lastDuration: null,
    quality: null,
  };

  if (!previousSession || previousSession.sets.length === 0) {
    return result;
  }

  // Get corresponding set from previous session (by index, oldest first)
  // Previous session sets are sorted newest first, so reverse for comparison
  const previousSetsOldestFirst = [...previousSession.sets].reverse();
  const correspondingSet = previousSetsOldestFirst[setIndex];

  if (!correspondingSet) {
    return result;
  }

  result.lastReps = correspondingSet.reps ?? null;
  result.lastWeight = correspondingSet.weight ?? null;
  result.lastDuration = correspondingSet.duration ?? null;

  // Compute quality (did we beat, match, or underperform?)
  // Priority: volume comparison > reps comparison > duration comparison
  if (
    currentSet.weight !== undefined &&
    currentSet.reps !== undefined &&
    correspondingSet.weight !== undefined &&
    correspondingSet.reps !== undefined
  ) {
    const currentVolume = currentSet.weight * currentSet.reps;
    const previousVolume = correspondingSet.weight * correspondingSet.reps;

    if (currentVolume > previousVolume) {
      result.quality = "beat";
    } else if (currentVolume === previousVolume) {
      result.quality = "matched";
    } else {
      result.quality = "under";
    }
  } else if (
    currentSet.reps !== undefined &&
    correspondingSet.reps !== undefined
  ) {
    if (currentSet.reps > correspondingSet.reps) {
      result.quality = "beat";
    } else if (currentSet.reps === correspondingSet.reps) {
      result.quality = "matched";
    } else {
      result.quality = "under";
    }
  } else if (
    currentSet.duration !== undefined &&
    correspondingSet.duration !== undefined
  ) {
    if (currentSet.duration > correspondingSet.duration) {
      result.quality = "beat";
    } else if (currentSet.duration === correspondingSet.duration) {
      result.quality = "matched";
    } else {
      result.quality = "under";
    }
  }

  return result;
}

/**
 * Sparkline data point for volume trend chart.
 */
export interface SparklineDataPoint {
  /** Session date for tooltip */
  date: string;
  /** Primary metric value (volume, reps, or duration) */
  value: number;
  /** Metric type for formatting */
  metricType: "volume" | "reps" | "duration";
}

/**
 * Build sparkline data from sessions for trend visualization.
 *
 * Returns up to 8 most recent sessions with their primary metric.
 */
export function buildSparklineData(
  sessions: ExerciseSession[],
  maxPoints: number = 8
): SparklineDataPoint[] {
  if (sessions.length === 0) return [];

  // Determine which metric to use based on first session
  const firstSession = sessions[0]!;
  let metricType: SparklineDataPoint["metricType"];

  if (firstSession.totals.volume > 0) {
    metricType = "volume";
  } else if (firstSession.totals.reps > 0) {
    metricType = "reps";
  } else {
    metricType = "duration";
  }

  // Build data points (oldest first for proper chart display)
  const recentSessions = sessions.slice(0, maxPoints).reverse();

  return recentSessions.map((session) => {
    let value: number;
    switch (metricType) {
      case "volume":
        value = session.totals.volume;
        break;
      case "reps":
        value = session.totals.reps;
        break;
      case "duration":
        value = session.totals.durationSec;
        break;
    }

    return {
      date: session.displayDate,
      value,
      metricType,
    };
  });
}

/**
 * Determine overall trend direction from sparkline data.
 */
export function computeTrendDirection(
  data: SparklineDataPoint[]
): "up" | "down" | "flat" {
  if (data.length < 2) return "flat";

  // Compare first half average to second half average
  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint);
  const secondHalf = data.slice(midpoint);

  const firstAvg =
    firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

  // Consider 5% threshold for "meaningful" change
  if (changePercent > 5) return "up";
  if (changePercent < -5) return "down";
  return "flat";
}
