"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLastSet } from "@/hooks/useLastSet";
import { PERFORMANCE_COLORS } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { TrendingUp } from "lucide-react";

interface GhostSetDisplayProps {
  exerciseId: string | null;
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
  suggestion,
  className,
}: GhostSetDisplayProps) {
  const { lastSet, history, formatTimeAgo } = useLastSet(exerciseId);
  const { unit } = useWeightUnit();

  // Skip first entry (lastSet) and take next 3 for previous history
  const previousHistory = (history ?? []).slice(1, 4);

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
            "bg-muted/30 dark:bg-[#141414] border-border dark:border-[#262626]",
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
                      <span className="font-mono text-lg font-semibold tabular-nums text-foreground dark:text-[#D4FF00]">
                        {lastSet.weight}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        ×
                      </span>
                    </>
                  )}

                  {lastSet.reps !== undefined && (
                    <span className="font-mono text-lg font-semibold tabular-nums text-foreground dark:text-[#D4FF00]">
                      {lastSet.reps}
                    </span>
                  )}

                  {lastSet.duration !== undefined && (
                    <span className="font-mono text-lg font-semibold tabular-nums text-foreground dark:text-[#D4FF00]">
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
            <div className="px-4 py-2 border-t border-border dark:border-[#262626]">
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
            <div className="px-4 py-3 border-t border-border dark:border-[#262626]">
              <div className="flex items-center justify-between gap-4">
                {/* Label with icon */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-foreground dark:text-[#D4FF00]" />
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
                      color: "#b0c900", // Darker chartreuse for readability in light mode
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
