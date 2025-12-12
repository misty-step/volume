"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { WeightUnit, Set } from "@/types/domain";
import { convertWeight, normalizeWeightUnit } from "@/lib/weight-utils";
import { formatDuration } from "@/lib/date-utils";
import { Dumbbell, Timer, Hash } from "lucide-react";

export interface DailyTotals {
  totalSets: number;
  totalReps: number;
  totalDurationSec: number;
  totalVolume: number;
}

interface DailyTotalsBannerProps {
  todaysSets: Set[];
  preferredUnit: WeightUnit;
  className?: string;
}

/**
 * Compute daily totals from today's sets.
 */
export function computeDailyTotals(
  sets: Set[],
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
      <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap text-sm font-mono">
        {/* Sets count - always show */}
        <StatPill
          icon={<Hash className="w-3.5 h-3.5" />}
          value={totals.totalSets}
          label={totals.totalSets === 1 ? "set" : "sets"}
        />

        {/* Volume (if weighted sets exist) */}
        {hasVolume && (
          <StatPill
            icon={<Dumbbell className="w-3.5 h-3.5" />}
            value={Math.round(totals.totalVolume).toLocaleString()}
            label={preferredUnit}
            highlight
          />
        )}

        {/* Reps (if any rep-based sets, and no volume to show) */}
        {hasReps && !hasVolume && (
          <StatPill
            icon={<Hash className="w-3.5 h-3.5" />}
            value={totals.totalReps.toLocaleString()}
            label="reps"
            highlight
          />
        )}

        {/* Duration (if any timed sets) */}
        {hasDuration && (
          <StatPill
            icon={<Timer className="w-3.5 h-3.5" />}
            value={formatDuration(totals.totalDurationSec)}
            highlight={!hasVolume && !hasReps}
          />
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
