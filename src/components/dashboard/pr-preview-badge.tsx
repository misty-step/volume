"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, Zap } from "lucide-react";
import { PERFORMANCE_COLORS } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

interface PRPreviewBadgeProps {
  isPR: boolean;
  prType?: "weight" | "reps" | "volume" | "duration";
  delta?: string;
  className?: string;
}

/**
 * PR Preview Badge - Real-time PR detection feedback
 *
 * Shows animated badge when user's input would result in a Personal Record.
 * Creates excitement and motivation before submission.
 *
 * Design:
 * - Performance Dashboard aesthetic (chartreuse accent)
 * - Icon varies by PR type (Trophy for weight, TrendingUp for reps, Zap for volume)
 * - Smooth scale + fade animation
 * - Pulsing glow effect for emphasis
 */
export function PRPreviewBadge({
  isPR,
  prType,
  delta,
  className,
}: PRPreviewBadgeProps) {
  // Select icon based on PR type
  const Icon =
    prType === "weight"
      ? Trophy
      : prType === "reps"
        ? TrendingUp
        : prType === "volume"
          ? Zap
          : Trophy;

  return (
    <AnimatePresence mode="wait">
      {isPR && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
          }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0.0, 0.2, 1],
          }}
          className={cn("relative inline-flex items-center gap-2", className)}
        >
          {/* Pulsing glow background */}
          <motion.div
            className="absolute inset-0 rounded-lg"
            style={{
              backgroundColor: PERFORMANCE_COLORS.accent.primaryDim,
              filter: `blur(8px)`,
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Badge content */}
          <div
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg border-2"
            style={{
              backgroundColor: PERFORMANCE_COLORS.base.elevated,
              borderColor: PERFORMANCE_COLORS.accent.primary,
              boxShadow: `0 0 16px ${PERFORMANCE_COLORS.accent.primaryGlow}`,
            }}
          >
            {/* Icon */}
            <Icon
              className="h-4 w-4"
              style={{ color: PERFORMANCE_COLORS.accent.primary }}
            />

            {/* Text */}
            <div className="flex flex-col gap-0.5">
              <span
                className="font-mono text-xs font-bold uppercase tracking-wider"
                style={{ color: PERFORMANCE_COLORS.accent.primary }}
              >
                PR Attempt
              </span>
              {delta && (
                <span
                  className="font-mono text-xs"
                  style={{ color: PERFORMANCE_COLORS.text.secondary }}
                >
                  {delta}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
