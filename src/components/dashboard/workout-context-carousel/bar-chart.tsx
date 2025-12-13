"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface BarData {
  value: number;
  label?: string;
}

interface BarChartProps {
  data: BarData[];
  className?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
}

/**
 * Brutalist Bar Chart - Thick, blocky bars for trend visualization
 *
 * Design: Raw, industrial aesthetic matching Brutalist system
 * - 8px wide bars (thick, not delicate)
 * - No axis lines, no labels
 * - Last bar accented in brand color
 * - Auto-scales to max value
 */
export function BarChart({
  data,
  className,
  height = 32,
  barWidth = 8,
  barGap = 4,
}: BarChartProps) {
  const { bars, width } = useMemo(() => {
    if (data.length === 0) {
      return { bars: [], width: 0 };
    }

    const values = data.map((d) => d.value);
    const max = Math.max(...values);
    const normalizedMax = max || 1; // Prevent division by zero

    const calculatedBars = values.map((value, i) => ({
      height: (value / normalizedMax) * height,
      isLast: i === values.length - 1,
    }));

    const totalWidth =
      calculatedBars.length * barWidth + (calculatedBars.length - 1) * barGap;

    return { bars: calculatedBars, width: totalWidth };
  }, [data, height, barWidth, barGap]);

  if (bars.length === 0) {
    return null;
  }

  return (
    <svg
      width={width}
      height={height}
      className={cn("shrink-0", className)}
      aria-label="Session trend chart"
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={i * (barWidth + barGap)}
          y={height - bar.height}
          width={barWidth}
          height={Math.max(bar.height, 2)} // Min 2px for visibility
          rx={1}
          className={cn(
            bar.isLast
              ? "fill-danger-red dark:fill-safety-orange"
              : "fill-concrete-gray/30 dark:fill-concrete-gray/20"
          )}
        />
      ))}
    </svg>
  );
}

export type { BarData, BarChartProps };
