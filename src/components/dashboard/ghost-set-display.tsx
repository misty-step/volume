"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLastSet } from "@/hooks/useLastSet";
import { suggestNextSet } from "@/lib/set-suggestion-engine";
import { PERFORMANCE_COLORS } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { TrendingUp } from "lucide-react";

interface GhostSetDisplayProps {
  exerciseId: string | null;
  className?: string;
  onSuggestionAvailable?: (suggestion: {
    reps?: number;
    weight?: number;
    duration?: number;
  }) => void;
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
  className,
  onSuggestionAvailable,
}: GhostSetDisplayProps) {
  const { lastSet, formatTimeAgo } = useLastSet(exerciseId);
  const { unit } = useWeightUnit();

  // Generate suggestion based on last set
  const suggestion = lastSet ? suggestNextSet(lastSet, unit) : null;

  // Notify parent when suggestion changes
  React.useEffect(() => {
    if (suggestion && onSuggestionAvailable) {
      onSuggestionAvailable({
        reps: suggestion.reps,
        weight: suggestion.weight,
        duration: suggestion.duration,
      });
    }
  }, [suggestion, onSuggestionAvailable]);

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
            "relative overflow-hidden rounded-md border px-4 py-3",
            className
          )}
          style={{
            backgroundColor: PERFORMANCE_COLORS.base.surface,
            borderColor: PERFORMANCE_COLORS.base.border,
          }}
        >
          {/* Subtle glow accent on left edge */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[2px]"
            style={{
              backgroundColor: PERFORMANCE_COLORS.accent.primary,
              boxShadow: `0 0 8px ${PERFORMANCE_COLORS.accent.primaryGlow}`,
            }}
          />

          <div className="flex items-center justify-between gap-4">
            {/* Label */}
            <div
              className="font-mono text-xs uppercase tracking-wider"
              style={{ color: PERFORMANCE_COLORS.text.tertiary }}
            >
              Last Set
            </div>

            {/* Data Display */}
            <div className="flex items-center gap-3">
              {/* Weight × Reps */}
              <div className="flex items-baseline gap-1.5">
                {lastSet.weight !== undefined && lastSet.weight !== null && (
                  <>
                    <span
                      className="font-mono text-lg font-semibold tabular-nums"
                      style={{ color: PERFORMANCE_COLORS.accent.primary }}
                    >
                      {lastSet.weight}
                    </span>
                    <span
                      className="font-mono text-xs"
                      style={{ color: PERFORMANCE_COLORS.text.secondary }}
                    >
                      ×
                    </span>
                  </>
                )}

                {lastSet.reps !== undefined && (
                  <span
                    className="font-mono text-lg font-semibold tabular-nums"
                    style={{ color: PERFORMANCE_COLORS.accent.primary }}
                  >
                    {lastSet.reps}
                  </span>
                )}

                {lastSet.duration !== undefined && (
                  <span
                    className="font-mono text-lg font-semibold tabular-nums"
                    style={{ color: PERFORMANCE_COLORS.accent.primary }}
                  >
                    {Math.floor(lastSet.duration / 60)}:
                    {String(lastSet.duration % 60).padStart(2, "0")}
                  </span>
                )}
              </div>

              {/* Time Ago */}
              <span
                className="font-mono text-xs tabular-nums"
                style={{ color: PERFORMANCE_COLORS.text.tertiary }}
              >
                {formatTimeAgo(lastSet.performedAt)}
              </span>
            </div>
          </div>

          {/* Suggestion Display */}
          {suggestion && (
            <div
              className="mt-3 pt-3 border-t"
              style={{ borderColor: PERFORMANCE_COLORS.base.border }}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Label with icon */}
                <div className="flex items-center gap-2">
                  <TrendingUp
                    className="h-3 w-3"
                    style={{ color: PERFORMANCE_COLORS.accent.primary }}
                  />
                  <div
                    className="font-mono text-xs uppercase tracking-wider"
                    style={{ color: PERFORMANCE_COLORS.text.tertiary }}
                  >
                    Try Next
                  </div>
                </div>

                {/* Suggestion Data */}
                <div className="flex items-center gap-3">
                  <div className="flex items-baseline gap-1.5">
                    {suggestion.weight !== undefined && (
                      <>
                        <span
                          className="font-mono text-lg font-semibold tabular-nums"
                          style={{ color: PERFORMANCE_COLORS.text.primary }}
                        >
                          {suggestion.weight}
                        </span>
                        <span
                          className="font-mono text-xs"
                          style={{ color: PERFORMANCE_COLORS.text.secondary }}
                        >
                          ×
                        </span>
                      </>
                    )}

                    {suggestion.reps !== undefined && (
                      <span
                        className="font-mono text-lg font-semibold tabular-nums"
                        style={{ color: PERFORMANCE_COLORS.text.primary }}
                      >
                        {suggestion.reps}
                      </span>
                    )}

                    {suggestion.duration !== undefined && (
                      <span
                        className="font-mono text-lg font-semibold tabular-nums"
                        style={{ color: PERFORMANCE_COLORS.text.primary }}
                      >
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
                      color: PERFORMANCE_COLORS.accent.primary,
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
