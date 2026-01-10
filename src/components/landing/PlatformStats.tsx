"use client";

import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../../convex/_generated/api";

/**
 * Format large numbers with comma separators.
 * e.g., 12847 -> "12,847"
 */
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Platform-wide aggregate metrics for social proof.
 * Hidden when below threshold (query returns null).
 *
 * Displays:
 * - Total sets logged
 * - Total unique lifters
 * - Sets logged this week
 */
export function PlatformStats() {
  const stats = useQuery(api.platformStats.getPlatformStats);

  // Loading state - show subtle skeleton
  if (stats === undefined) {
    return (
      <div className="w-full py-6 md:py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center animate-pulse">
                <div className="h-10 md:h-14 bg-concrete-white/5 rounded mb-2" />
                <div className="h-4 bg-concrete-white/5 rounded w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Hidden when below threshold
  if (stats === null) {
    return null;
  }

  const metrics = [
    {
      value: stats.totalSets,
      label: "SETS LOGGED",
      delay: 0,
    },
    {
      value: stats.totalLifters,
      label: "LIFTERS",
      delay: 0.1,
    },
    {
      value: stats.setsThisWeek,
      label: "THIS WEEK",
      delay: 0.2,
    },
  ];

  return (
    <div className="w-full py-6 md:py-8 border-y border-concrete-white/10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          {metrics.map((metric) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: metric.delay }}
              className="text-center"
            >
              <div className="font-mono text-3xl md:text-5xl font-bold text-danger-red tabular-nums">
                {formatNumber(metric.value)}
              </div>
              <div className="font-mono text-xs md:text-sm text-concrete-gray tracking-wider mt-1">
                {metric.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
