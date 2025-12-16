"use client";

import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface PRBadgeProps {
  /** Size variant */
  size?: "sm" | "md";
  /** Additional className */
  className?: string;
}

/**
 * Personal Record badge with brutalist styling.
 *
 * Displays "NEW PR" with inverted colors for high visibility.
 * Uses the brand's danger-red color for maximum impact.
 */
export function PRBadge({ size = "sm", className }: PRBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wider",
        "bg-danger-red text-white",
        "border-2 border-concrete-black dark:border-concrete-white",
        size === "sm" && "px-1.5 py-0.5 text-[10px]",
        size === "md" && "px-2 py-1 text-xs",
        className
      )}
      aria-label="Personal Record"
    >
      <Trophy className={cn(size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3")} />
      <span>PR</span>
    </span>
  );
}

export type { PRBadgeProps };
