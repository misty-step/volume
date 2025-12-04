"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLastSet } from "@/hooks/useLastSet";
import { PERFORMANCE_COLORS } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

interface GhostSetDisplayProps {
  exerciseId: string | null;
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
  className,
}: GhostSetDisplayProps) {
  const { lastSet, formatTimeAgo } = useLastSet(exerciseId);

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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
