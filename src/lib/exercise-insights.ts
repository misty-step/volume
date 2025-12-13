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
