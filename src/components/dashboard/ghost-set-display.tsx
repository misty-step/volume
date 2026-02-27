"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLastSet } from "@/hooks/useLastSet";
import { PERFORMANCE_COLORS } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { formatDuration } from "@/lib/date-utils";
import { TrendingUp, Calendar } from "lucide-react";
import type { Set } from "@/types/domain";

interface GhostSetDisplayProps {
  exerciseId: string | null;
  todaysSets?: Set[];
  suggestion?: {
    reps?: number;
    weight?: number;
    duration?: number;
    reasoning: string;
    strategy: string;
  } | null;
  className?: string;
}

/**
 * Ghost Set Display - Shows last set performance inline during workout logging
 *
 * Design: Performance Dashboard aesthetic
 * - Dark surface with subtle border
 * - High contrast chartreuse accent for data
 * - JetBrains Mono for weight/reps alignment
 * - Smooth fade-in animation
 *
 * Purpose: Eliminates 30-second context switch for users checking their last performance
 */
export function GhostSetDisplay({
  exerciseId,
  todaysSets,
  suggestion,
  className,
}: GhostSetDisplayProps) {
  const { lastSet, history, formatTimeAgo } = useLastSet(exerciseId);
  const { unit } = useWeightUnit();

  // Skip first entry (lastSet) and take next 3 for previous history
  const previousHistory = (history ?? []).slice(1, 4);

  // Compute today's totals for this exercise
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

  return (
    <AnimatePresence mode="wait">
      {lastSet && (
        <motion.div
          key={lastSet._id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
          className={cn(
            "relative overflow-hidden rounded-md border",
            "bg-muted/30 dark:bg-[var(--ghost-bg)] border-border dark:border-[var(--ghost-border)]",
            className
          )}
        >
          {/* Subtle glow accent on left edge */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[2px]"
            style={{
              backgroundColor: PERFORMANCE_COLORS.accent.primary,
              boxShadow: `0 0 8px ${PERFORMANCE_COLORS.accent.primaryGlow}`,
            }}
          />

          {/* Today's Total for This Exercise */}
          {todayTotal && (
            <div className="px-4 py-3 border-b border-border dark:border-[var(--ghost-border)]">
              <div className="flex items-center justify-between gap-4">
                {/* Label with icon */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-foreground dark:text-[var(--ghost-accent)]" />
                  <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Today
                  </div>
                </div>

                {/* Today's totals */}
                <div className="flex items-center gap-2">
                  {/* Duration-based exercise */}
                  {todayTotal.totalDuration > 0 && (
                    <span className="font-mono text-lg font-bold tabular-nums text-foreground dark:text-[var(--ghost-accent)]">
                      {formatDuration(todayTotal.totalDuration)}
                    </span>
                  )}

                  {/* Rep-based exercise */}
                  {todayTotal.totalReps > 0 && (
                    <span className="font-mono text-lg font-bold tabular-nums text-foreground dark:text-[var(--ghost-accent)]">
                      {todayTotal.totalReps.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        reps
                      </span>
                    </span>
                  )}

                  {/* Volume for weighted exercises */}
                  {todayTotal.totalVolume > 0 && (
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      •{" "}
                      <span className="text-foreground/80">
                        {Math.round(todayTotal.totalVolume).toLocaleString()}
                      </span>{" "}
                      {unit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Label */}
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Last Set
              </div>

              {/* Data Display */}
              <div className="flex items-center gap-3">
                {/* Weight × Reps */}
                <div className="flex items-baseline gap-1.5">
                  {lastSet.weight !== undefined && lastSet.weight !== null && (
                    <>
                      <span className="font-mono text-lg font-semibold tabular-nums text-foreground dark:text-[var(--ghost-accent)]">
                        {lastSet.weight}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        ×
                      </span>
                    </>
                  )}

                  {lastSet.reps !== undefined && (
                    <span className="font-mono text-lg font-semibold tabular-nums text-foreground dark:text-[var(--ghost-accent)]">
                      {lastSet.reps}
                    </span>
                  )}

                  {lastSet.duration !== undefined && (
                    <span className="font-mono text-lg font-semibold tabular-nums text-foreground dark:text-[var(--ghost-accent)]">
                      {Math.floor(lastSet.duration / 60)}:
                      {String(lastSet.duration % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>

                {/* Time Ago */}
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatTimeAgo(lastSet.performedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Previous History List */}
          {previousHistory.length > 0 && (
            <div className="px-4 py-2 border-t border-border dark:border-[var(--ghost-border)]">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-y-1.5 gap-x-2 text-xs font-mono">
                {previousHistory.map((set) => (
                  <React.Fragment key={set._id}>
                    {/* Time */}
                    <span className="text-muted-foreground tabular-nums opacity-60">
                      {formatTimeAgo(set.performedAt)}
                    </span>

                    {/* Weight (Right aligned) */}
                    <span className="text-foreground/80 text-right tabular-nums">
                      {set.weight}
                    </span>

                    {/* x separator */}
                    <span className="text-muted-foreground text-center">×</span>

                    {/* Reps (Right aligned) */}
                    <span className="text-foreground/80 text-right tabular-nums">
                      {set.reps}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Suggestion Display */}
          {suggestion && (
            <div className="px-4 py-3 border-t border-border dark:border-[var(--ghost-border)]">
              <div className="flex items-center justify-between gap-4">
                {/* Label with icon */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-foreground dark:text-[var(--ghost-accent)]" />
                  <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Try Next
                  </div>
                </div>

                {/* Suggestion Data */}
                <div className="flex items-center gap-3">
                  <div className="flex items-baseline gap-1.5">
                    {suggestion.weight !== undefined && (
                      <>
                        <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                          {suggestion.weight}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          ×
                        </span>
                      </>
                    )}

                    {suggestion.reps !== undefined && (
                      <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                        {suggestion.reps}
                      </span>
                    )}

                    {suggestion.duration !== undefined && (
                      <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                        {Math.floor(suggestion.duration / 60)}:
                        {String(suggestion.duration % 60).padStart(2, "0")}
                      </span>
                    )}
                  </div>

                  {/* Reasoning badge */}
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: PERFORMANCE_COLORS.accent.primaryDim,
                      color: "var(--ghost-accent-text)",
                    }}
                  >
                    {suggestion.strategy === "increase-reps" && "+1 rep"}
                    {suggestion.strategy === "increase-weight" &&
                      `+${unit === "kg" ? "2.5kg" : "5lbs"}`}
                    {suggestion.strategy === "increase-duration" && "+5s"}
                    {suggestion.strategy === "maintain" && "same"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
