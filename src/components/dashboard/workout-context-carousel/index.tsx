"use client";

import { useState, useMemo, useCallback } from "react";
import { useLastSet } from "@/hooks/useLastSet";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { suggestNextSet, SetSuggestion } from "@/lib/set-suggestion-engine";
import {
  buildExerciseSessions,
  computeTrendSummary,
} from "@/lib/exercise-insights";
import { cn } from "@/lib/utils";
import type { Set } from "@/types/domain";
import { DataBlock } from "./data-block";
import { DetailsSection } from "./details-section";

interface WorkoutContextCarouselProps {
  exerciseId: string | null;
  todaysSets?: Set[];
  onRepeat: (weight?: number, reps?: number, duration?: number) => void;
  onUseSuggestion: (suggestion: SetSuggestion) => void;
  className?: string;
}

/**
 * Workout Context v3 - Data Block + Drill-Down
 *
 * Single dense block design (no carousel):
 * - Bar chart showing session trend
 * - 3-col metrics: LAST | TODAY | TRY NEXT
 * - Action buttons: Repeat | Use This
 * - Collapsible details section with history + trends
 */
export function WorkoutContextCarousel({
  exerciseId,
  todaysSets,
  onRepeat,
  onUseSuggestion,
  className,
}: WorkoutContextCarouselProps) {
  const [expanded, setExpanded] = useState(false);
  const { lastSet, history, formatTimeAgo } = useLastSet(exerciseId);
  const { unit } = useWeightUnit();

  // Build sessions from history
  const sessions = useMemo(() => {
    return history ? buildExerciseSessions(history, unit) : [];
  }, [history, unit]);

  // Compute trend summary
  const trendSummary = useMemo(() => {
    return computeTrendSummary(sessions.slice(0, 7), "Last 7 sessions");
  }, [sessions]);

  // Generate suggestion from last set
  const suggestion = useMemo(() => {
    return lastSet ? suggestNextSet(lastSet, unit) : null;
  }, [lastSet, unit]);

  // Today's totals for this exercise
  const todayTotal = useMemo(() => {
    if (!todaysSets || !exerciseId) return null;
    const exerciseSets = todaysSets.filter((s) => s.exerciseId === exerciseId);
    if (exerciseSets.length === 0) return null;

    return {
      setCount: exerciseSets.length,
      totalReps: exerciseSets.reduce((sum, s) => sum + (s.reps ?? 0), 0),
      totalDuration: exerciseSets.reduce(
        (sum, s) => sum + (s.duration ?? 0),
        0
      ),
      totalVolume: exerciseSets.reduce((sum, s) => {
        if (s.reps && s.weight) return sum + s.reps * s.weight;
        return sum;
      }, 0),
    };
  }, [todaysSets, exerciseId]);

  // Handle repeat action
  const handleRepeat = useCallback(() => {
    if (lastSet) {
      onRepeat(lastSet.weight, lastSet.reps, lastSet.duration);
    }
  }, [lastSet, onRepeat]);

  // Handle use suggestion action
  const handleUseSuggestion = useCallback(() => {
    if (suggestion) {
      onUseSuggestion(suggestion);
    }
  }, [suggestion, onUseSuggestion]);

  // Toggle expanded state
  const handleToggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Don't render if no exercise selected or no last set
  if (!exerciseId || !lastSet) {
    return null;
  }

  return (
    <div className={cn("space-y-0", className)}>
      <DataBlock
        lastSet={lastSet}
        todayTotal={todayTotal}
        suggestion={suggestion}
        sessions={sessions}
        formatTimeAgo={formatTimeAgo}
        unit={unit}
        expanded={expanded}
        onToggleExpand={handleToggleExpand}
        onRepeat={handleRepeat}
        onUseSuggestion={handleUseSuggestion}
      />

      <DetailsSection
        expanded={expanded}
        sessions={sessions}
        trendSummary={trendSummary}
        unit={unit}
      />
    </div>
  );
}

export type { WorkoutContextCarouselProps };
