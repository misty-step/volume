import type { Set, WeightUnit } from "@/types/domain";
import { convertWeight, normalizeWeightUnit } from "./weight-utils";

export type MetricKind = "volume" | "reps" | "duration";

export interface SummaryMetric {
  kind: MetricKind;
  value: number;
}

export interface ExerciseMetrics {
  totalReps: number;
  totalDuration: number;
  totalVolume: number;
  primary: SummaryMetric;
  secondary?: SummaryMetric;
}

export function computeExerciseMetrics(
  sets: Set[],
  targetUnit: WeightUnit = "lbs"
): ExerciseMetrics {
  let totalReps = 0;
  let totalDuration = 0;
  let totalVolume = 0;
  let mostRecentRepsAt = 0;
  let mostRecentDurationAt = 0;

  for (const set of sets) {
    if (set.reps !== undefined) {
      totalReps += set.reps;
      if (set.performedAt > mostRecentRepsAt) {
        mostRecentRepsAt = set.performedAt;
      }

      if (set.weight) {
        const setUnit = normalizeWeightUnit(set.unit);
        const convertedWeight = convertWeight(set.weight, setUnit, targetUnit);
        totalVolume += set.reps * convertedWeight;
      }
    }

    if (set.duration !== undefined) {
      totalDuration += set.duration;
      if (set.performedAt > mostRecentDurationAt) {
        mostRecentDurationAt = set.performedAt;
      }
    }
  }

  let primary: SummaryMetric;
  let secondary: SummaryMetric | undefined;

  if (totalVolume > 0) {
    primary = { kind: "volume", value: totalVolume };
    if (totalDuration > 0) {
      secondary = { kind: "duration", value: totalDuration };
    }
  } else if (totalReps > 0 && totalDuration > 0) {
    if (mostRecentDurationAt > mostRecentRepsAt) {
      primary = { kind: "duration", value: totalDuration };
      secondary = { kind: "reps", value: totalReps };
    } else {
      primary = { kind: "reps", value: totalReps };
      secondary = { kind: "duration", value: totalDuration };
    }
  } else if (totalDuration > 0) {
    primary = { kind: "duration", value: totalDuration };
  } else {
    primary = { kind: "reps", value: totalReps };
  }

  return {
    totalReps,
    totalDuration,
    totalVolume,
    primary,
    secondary,
  };
}
