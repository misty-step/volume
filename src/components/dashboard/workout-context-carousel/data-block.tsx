"use client";

import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/date-utils";
import { BrutalistButton } from "@/components/brutalist";
import { RotateCcw, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, type BarData } from "./bar-chart";
import type { Set as WorkoutSet } from "@/types/domain";
import type { SetSuggestion } from "@/lib/set-suggestion-engine";
import type { ExerciseSession } from "@/lib/exercise-insights";

interface TodayTotal {
  setCount: number;
  totalReps: number;
  totalDuration: number;
  totalVolume: number;
}

interface DataBlockProps {
  lastSet: WorkoutSet;
  todayTotal: TodayTotal | null;
  suggestion: SetSuggestion | null;
  sessions: ExerciseSession[];
  formatTimeAgo: (timestamp: number) => string;
  unit: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onRepeat: () => void;
  onUseSuggestion: () => void;
}

/**
 * Data Block - Dense single-block display with metrics and actions
 *
 * Layout:
 * - Bar chart at top (thick brutalist bars)
 * - 3-col metrics: LAST | TODAY | TRY NEXT
 * - Action buttons: Repeat | Use This
 * - "More details" toggle
 */
export function DataBlock({
  lastSet,
  todayTotal,
  suggestion,
  sessions,
  formatTimeAgo,
  unit,
  expanded,
  onToggleExpand,
  onRepeat,
  onUseSuggestion,
}: DataBlockProps) {
  const isDurationBased = lastSet.duration !== undefined;
  const isWeighted = lastSet.weight !== undefined && lastSet.weight > 0;

  // Build bar data from sessions (last 6)
  const barData: BarData[] = sessions
    .slice(0, 6)
    .reverse()
    .map((session) => {
      let value = 0;
      if (session.totals.volume > 0) {
        value = session.totals.volume;
      } else if (session.totals.reps > 0) {
        value = session.totals.reps;
      } else if (session.totals.durationSec > 0) {
        value = session.totals.durationSec;
      }
      return { value, label: session.displayDate };
    });

  const hasHistory = sessions.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-concrete-black dark:border-concrete-white",
        "bg-background p-5",
        "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
      )}
    >
      {/* Bar Chart */}
      {barData.length > 1 && (
        <div className="flex justify-center mb-5">
          <BarChart data={barData} height={32} barWidth={8} barGap={4} />
        </div>
      )}

      {/* 3-Column Metrics */}
      <div className="grid grid-cols-3 gap-4 text-center mb-5">
        {/* Last Set - Primary */}
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Last
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {formatSetValue(lastSet, isDurationBased, isWeighted)}
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">
            {formatTimeAgo(lastSet.performedAt)}
          </div>
        </div>

        {/* Today - Secondary */}
        <div className="border-x border-border/30 px-2">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Today
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums text-danger-red dark:text-safety-orange">
            {formatTodayValue(todayTotal, isDurationBased)}
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">
            {todayTotal ? `${todayTotal.setCount} sets` : "—"}
          </div>
        </div>

        {/* Try Next - Tertiary */}
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Try Next
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums text-safety-orange">
            {formatSuggestionValue(suggestion)}
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">
            {getSuggestionBadge(suggestion, unit)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <BrutalistButton
          variant="outline"
          size="default"
          className="w-full"
          onClick={onRepeat}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Repeat
        </BrutalistButton>

        <BrutalistButton
          variant="danger"
          size="default"
          className="w-full"
          onClick={onUseSuggestion}
          disabled={!suggestion}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Use This
        </BrutalistButton>
      </div>

      {/* More Details Toggle */}
      {hasHistory && (
        <button
          onClick={onToggleExpand}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 py-2",
            "font-mono text-xs uppercase tracking-wider",
            "text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              More details
            </>
          )}
        </button>
      )}
    </div>
  );
}

function formatSetValue(
  set: WorkoutSet,
  isDuration: boolean,
  isWeighted: boolean
): string {
  if (isDuration && set.duration !== undefined) {
    return formatDuration(set.duration);
  }
  if (isWeighted && set.weight !== undefined) {
    return `${set.weight}×${set.reps}`;
  }
  return `${set.reps ?? "—"}`;
}

function formatTodayValue(
  today: TodayTotal | null,
  isDuration: boolean
): string {
  if (!today) return "—";
  if (isDuration && today.totalDuration > 0) {
    return formatDuration(today.totalDuration);
  }
  if (today.totalReps > 0) {
    return `${today.totalReps}`;
  }
  return "—";
}

function formatSuggestionValue(suggestion: SetSuggestion | null): string {
  if (!suggestion) return "—";
  if (suggestion.duration !== undefined) {
    return formatDuration(suggestion.duration);
  }
  if (suggestion.weight !== undefined && suggestion.weight > 0) {
    return `${suggestion.weight}×${suggestion.reps}`;
  }
  return `${suggestion.reps ?? "—"}`;
}

function getSuggestionBadge(
  suggestion: SetSuggestion | null,
  unit: string
): string {
  if (!suggestion) return "—";
  switch (suggestion.strategy) {
    case "increase-reps":
      return "+1 rep";
    case "increase-weight":
      return unit === "kg" ? "+2.5 kg" : "+5 lbs";
    case "increase-duration":
      return "+5s";
    case "maintain":
      return "same";
    default:
      return "";
  }
}

export type { DataBlockProps };
