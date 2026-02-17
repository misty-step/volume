import { addDays, format, startOfDay } from "date-fns";
import { formatDuration } from "@/lib/date-utils";
interface SetInput {
  exerciseId: string;
  performedAt: number;
  reps?: number;
  duration?: number;
  weight?: number;
  unit?: string;
}

export type TrendMetric = "reps" | "duration";

export interface TrendPoint {
  date: string;
  label: string;
  value: number;
}

export interface ExerciseTrendSummary {
  metric: TrendMetric;
  points: TrendPoint[];
  total: number;
  bestDay: number;
}

export interface TodayTotalsSummary {
  totalSets: number;
  totalReps: number;
  totalDurationSeconds: number;
  topExercises: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: number;
    durationSeconds: number;
  }>;
}

export interface ExercisePerformanceSummary {
  totalSets: number;
  totalReps: number;
  totalDurationSeconds: number;
  bestReps: number;
  bestDurationSeconds: number;
  lastPerformedAt: number | null;
}

function dayKey(timestamp: number): string {
  // Use date-fns formatting so bucketing matches the date window keys.
  return format(new Date(timestamp), "yyyy-MM-dd");
}

function buildDayWindow(
  days: number,
  referenceTime: number
): Array<{ key: string; label: string }> {
  const start = startOfDay(addDays(new Date(referenceTime), -(days - 1)));
  return Array.from({ length: days }, (_, index) => {
    const current = addDays(start, index);
    return {
      key: format(current, "yyyy-MM-dd"),
      label: format(current, "MMM d"),
    };
  });
}

export function aggregateExerciseTrend(
  sets: SetInput[],
  options?: { days?: number; referenceTime?: number }
): ExerciseTrendSummary {
  const days = options?.days ?? 14;
  const referenceTime = options?.referenceTime ?? Date.now();
  const metric: TrendMetric = sets.some((set) => set.reps !== undefined)
    ? "reps"
    : "duration";
  const byDay = new Map<string, number>();

  for (const set of sets) {
    const key = dayKey(set.performedAt);
    const current = byDay.get(key) ?? 0;
    const value = metric === "reps" ? (set.reps ?? 0) : (set.duration ?? 0);
    byDay.set(key, current + value);
  }

  const window = buildDayWindow(days, referenceTime);
  const points = window.map((entry) => ({
    date: entry.key,
    label: entry.label,
    value: byDay.get(entry.key) ?? 0,
  }));

  const total = points.reduce((sum, point) => sum + point.value, 0);
  const bestDay = points.reduce((max, point) => Math.max(max, point.value), 0);

  return {
    metric,
    points,
    total,
    bestDay,
  };
}

export function summarizeTodaySets(
  sets: SetInput[],
  exerciseNames: Map<string, string>
): TodayTotalsSummary {
  const topMap = new Map<
    string,
    {
      exerciseId: string;
      exerciseName: string;
      sets: number;
      reps: number;
      durationSeconds: number;
    }
  >();

  let totalReps = 0;
  let totalDurationSeconds = 0;

  for (const set of sets) {
    totalReps += set.reps ?? 0;
    totalDurationSeconds += set.duration ?? 0;

    const exerciseId = String(set.exerciseId);
    const current = topMap.get(exerciseId) ?? {
      exerciseId,
      exerciseName: exerciseNames.get(exerciseId) ?? "Unknown Exercise",
      sets: 0,
      reps: 0,
      durationSeconds: 0,
    };

    current.sets += 1;
    current.reps += set.reps ?? 0;
    current.durationSeconds += set.duration ?? 0;
    topMap.set(exerciseId, current);
  }

  const topExercises = Array.from(topMap.values())
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 4);

  return {
    totalSets: sets.length,
    totalReps,
    totalDurationSeconds,
    topExercises,
  };
}

export function summarizeExercisePerformance(
  sets: SetInput[]
): ExercisePerformanceSummary {
  if (sets.length === 0) {
    return {
      totalSets: 0,
      totalReps: 0,
      totalDurationSeconds: 0,
      bestReps: 0,
      bestDurationSeconds: 0,
      lastPerformedAt: null,
    };
  }

  let totalReps = 0;
  let totalDurationSeconds = 0;
  let bestReps = 0;
  let bestDurationSeconds = 0;
  let lastPerformedAt = 0;

  for (const set of sets) {
    const reps = set.reps ?? 0;
    const duration = set.duration ?? 0;
    totalReps += reps;
    totalDurationSeconds += duration;
    bestReps = Math.max(bestReps, reps);
    bestDurationSeconds = Math.max(bestDurationSeconds, duration);
    lastPerformedAt = Math.max(lastPerformedAt, set.performedAt);
  }

  return {
    totalSets: sets.length,
    totalReps,
    totalDurationSeconds,
    bestReps,
    bestDurationSeconds,
    lastPerformedAt,
  };
}

export function formatSetMetric(
  set: SetInput,
  fallbackUnit: "lbs" | "kg"
): string {
  if (set.duration !== undefined) {
    return formatDuration(set.duration);
  }

  if (set.reps === undefined) {
    return "Unknown";
  }

  if (set.weight !== undefined && set.weight > 0) {
    return `${set.reps} reps @ ${set.weight} ${set.unit ?? fallbackUnit}`;
  }

  return `${set.reps} reps`;
}
