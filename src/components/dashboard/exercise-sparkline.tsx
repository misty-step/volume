"use client";

import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import type { SparklineDataPoint } from "@/lib/exercise-insights";

interface ExerciseSparklineProps {
  /** Data points for the sparkline */
  data: SparklineDataPoint[];
  /** Trend direction for color coding */
  trend: "up" | "down" | "flat";
  /** Width of the sparkline container */
  width?: number;
  /** Height of the sparkline container */
  height?: number;
  /** Additional className */
  className?: string;
}

/**
 * Compact sparkline chart showing exercise volume/reps/duration trend.
 *
 * Uses Recharts AreaChart with minimal configuration for a clean look.
 * Color-coded by trend direction:
 * - Green/accent for upward trend
 * - Gray for flat trend
 * - Red for downward trend
 */
export function ExerciseSparkline({
  data,
  trend,
  width = 60,
  height = 24,
  className,
}: ExerciseSparklineProps) {
  // Determine colors based on trend
  const colors = useMemo(() => {
    switch (trend) {
      case "up":
        return {
          stroke: "hsl(var(--safety-orange))",
          fill: "hsl(var(--safety-orange) / 0.2)",
        };
      case "down":
        return {
          stroke: "hsl(var(--danger-red))",
          fill: "hsl(var(--danger-red) / 0.2)",
        };
      case "flat":
      default:
        return {
          stroke: "hsl(var(--concrete-gray))",
          fill: "hsl(var(--concrete-gray) / 0.1)",
        };
    }
  }, [trend]);

  // Calculate Y-axis domain with padding
  const domain = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 1;
    return [min - padding, max + padding];
  }, [data]);

  // Don't render if insufficient data
  if (data.length < 2) {
    return null;
  }

  return (
    <div
      className={cn("flex items-center", className)}
      style={{ width, height }}
      aria-label={`Trend: ${trend}`}
      role="img"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <YAxis domain={domain} hide />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            fill={colors.fill}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { ExerciseSparklineProps };
