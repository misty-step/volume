"use client";

import { useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { WeightUnit, Set as WorkoutSet } from "@/types/domain";
import { convertWeight, normalizeWeightUnit } from "@/lib/weight-utils";
import { formatDuration } from "@/lib/date-utils";
import { trackEvent } from "@/lib/analytics";
import { Dumbbell, Timer, Hash, Layers } from "lucide-react";

export interface DailyTotals {
  totalSets: number;
  totalReps: number;
  totalDurationSec: number;
  totalVolume: number;
}

interface DailyTotalsBannerProps {
  todaysSets: WorkoutSet[];
  preferredUnit: WeightUnit;
  className?: string;
}

/**
 * Compute daily totals from today's sets.
 */
export function computeDailyTotals(
  sets: WorkoutSet[],
  preferredUnit: WeightUnit
): DailyTotals {
  let totalSets = 0;
  let totalReps = 0;
  let totalDurationSec = 0;
  let totalVolume = 0;

  for (const set of sets) {
    totalSets++;

    if (set.reps !== undefined) {
      totalReps += set.reps;

      if (set.weight !== undefined) {
        const setUnit = normalizeWeightUnit(set.unit);
        const convertedWeight = convertWeight(
          set.weight,
          setUnit,
          preferredUnit
        );
        totalVolume += set.reps * convertedWeight;
      }
    }

    if (set.duration !== undefined) {
      totalDurationSec += set.duration;
    }
  }

  return { totalSets, totalReps, totalDurationSec, totalVolume };
}

/**
 * Sticky banner showing today's totals at a glance.
 * Shows sets count + primary metric (volume if weighted, reps if bodyweight, duration if time-based).
 */
export function DailyTotalsBanner({
  todaysSets,
  preferredUnit,
  className,
}: DailyTotalsBannerProps) {
  const totals = useMemo(
    () => computeDailyTotals(todaysSets, preferredUnit),
    [todaysSets, preferredUnit]
  );

  // Count unique exercises
  const exerciseCount = useMemo(() => {
    const uniqueExercises = new Set(todaysSets.map((s) => s.exerciseId));
    return uniqueExercises.size;
  }, [todaysSets]);

  // Track banner view once per mount (when there are sets)
  const hasTracked = useRef(false);
  useEffect(() => {
    if (totals.totalSets > 0 && !hasTracked.current) {
      hasTracked.current = true;
      trackEvent("Daily Totals Banner Viewed", {});
    }
  }, [totals.totalSets]);

  // Don't render if no sets today
  if (totals.totalSets === 0) return null;

  // Determine primary and secondary metrics based on what data we have
  const hasVolume = totals.totalVolume > 0;
  const hasReps = totals.totalReps > 0;
  const hasDuration = totals.totalDurationSec > 0;

  return (
    <div
      className={cn(
        "w-full border-b-3 border-concrete-black dark:border-concrete-white",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "py-3 px-4",
        className
      )}
    >
      <div className="flex items-center justify-center flex-wrap text-sm font-mono">
        {/* Exercises count - show first */}
        <StatPill
          icon={<Layers className="w-3.5 h-3.5" />}
          value={exerciseCount}
          label={exerciseCount === 1 ? "exercise" : "exercises"}
        />

        <Separator />

        {/* Sets count */}
        <StatPill
          icon={<Hash className="w-3.5 h-3.5" />}
          value={totals.totalSets}
          label={totals.totalSets === 1 ? "set" : "sets"}
        />

        {/* Volume (if weighted sets exist) */}
        {hasVolume && (
          <>
            <Separator />
            <StatPill
              icon={<Dumbbell className="w-3.5 h-3.5" />}
              value={Math.round(totals.totalVolume).toLocaleString()}
              label={preferredUnit}
              highlight
            />
          </>
        )}

        {/* Reps (always show if present) */}
        {hasReps && (
          <>
            <Separator />
            <StatPill
              icon={<Hash className="w-3.5 h-3.5" />}
              value={totals.totalReps.toLocaleString()}
              label="reps"
              highlight={!hasVolume}
            />
          </>
        )}

        {/* Duration (if any timed sets) */}
        {hasDuration && (
          <>
            <Separator />
            <StatPill
              icon={<Timer className="w-3.5 h-3.5" />}
              value={formatDuration(totals.totalDurationSec)}
              highlight={!hasVolume && !hasReps}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface StatPillProps {
  icon: React.ReactNode;
  value: string | number;
  label?: string;
  highlight?: boolean;
}

function StatPill({ icon, value, label, highlight }: StatPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        highlight && "text-danger-red dark:text-safety-orange font-bold"
      )}
    >
      {icon}
      <span className="tabular-nums">{value}</span>
      {label && <span className="text-muted-foreground text-xs">{label}</span>}
    </div>
  );
}

function Separator() {
  return (
    <span
      className="mx-2 md:mx-3 text-concrete-gray/30 select-none"
      aria-hidden="true"
    >
      │
    </span>
  );
}
