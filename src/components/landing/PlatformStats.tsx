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
 * Metric configuration used for both skeleton loader and data rendering.
 * Ensures consistency between loading state and final display.
 */
const METRICS_CONFIG = [
  { key: "totalSets", label: "SETS LOGGED" },
  { key: "totalLifters", label: "LIFTERS" },
  { key: "setsThisWeek", label: "THIS WEEK" },
] as const;

type MetricKey = (typeof METRICS_CONFIG)[number]["key"];

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

  // Loading state - show subtle skeleton (synced with METRICS_CONFIG)
  if (stats === undefined) {
    return (
      <div className="w-full py-6 md:py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {METRICS_CONFIG.map((metric) => (
              <div key={metric.key} className="text-center animate-pulse">
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

  const metrics = METRICS_CONFIG.map((config, index) => ({
    value: stats[config.key as MetricKey],
    label: config.label,
    delay: index * 0.1,
  }));

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
