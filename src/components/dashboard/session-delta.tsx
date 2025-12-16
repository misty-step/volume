"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SessionDelta } from "@/lib/exercise-insights";
import { formatDuration } from "@/lib/date-utils";

interface SessionDeltaDisplayProps {
  /** Session delta data */
  delta: SessionDelta;
  /** Additional className */
  className?: string;
}

/**
 * Displays session-over-session change with arrow indicator.
 *
 * Shows the absolute change value with directional arrow:
 * - ▲ +60 lbs (green/orange for up)
 * - ▼ -20 reps (red for down)
 * - = same (gray for no change)
 */
export function SessionDeltaDisplay({
  delta,
  className,
}: SessionDeltaDisplayProps) {
  const { value, unit, direction } = delta;

  // Format value based on unit type
  const formattedValue =
    unit === "sec" ? formatDuration(value) : value.toLocaleString();

  // Format unit label
  const unitLabel = unit === "sec" ? "" : ` ${unit}`;

  // Icon and colors based on direction
  const config = {
    up: {
      icon: TrendingUp,
      colorClass: "text-safety-orange",
      prefix: "+",
    },
    down: {
      icon: TrendingDown,
      colorClass: "text-danger-red",
      prefix: "-",
    },
    same: {
      icon: Minus,
      colorClass: "text-concrete-gray",
      prefix: "",
    },
  }[direction];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs tabular-nums",
        config.colorClass,
        className
      )}
      aria-label={`${direction === "up" ? "Increase" : direction === "down" ? "Decrease" : "Same as"} last session`}
    >
      <Icon className="w-3 h-3" />
      <span>
        {config.prefix}
        {formattedValue}
        {unitLabel}
      </span>
    </span>
  );
}

export type { SessionDeltaDisplayProps };
