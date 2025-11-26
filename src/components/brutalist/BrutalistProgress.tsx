"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { PRECISION_TIMING } from "@/lib/brutalist-motion";

interface BrutalistProgressProps {
  value: number; // 0-100
  max?: number;
  variant?: "default" | "danger" | "accent";
  segmented?: boolean;
  className?: string;
}

export function BrutalistProgress({
  value,
  max = 100,
  variant = "default",
  segmented = false,
  className,
}: BrutalistProgressProps) {
  const percentage = Math.min(100, (value / max) * 100);

  const variantColors = {
    default: "bg-concrete-gray",
    danger: "bg-danger-red",
    accent: "bg-safety-orange",
  };

  if (segmented) {
    const segments = 10;
    const filledSegments = Math.floor((percentage / 100) * segments);

    return (
      <div className={cn("flex gap-1 h-6", className)}>
        {Array.from({ length: segments }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              "flex-1 border-2 border-concrete-black dark:border-concrete-white",
              i < filledSegments && variantColors[variant]
            )}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: i < filledSegments ? 1 : 0 }}
            transition={{
              duration: PRECISION_TIMING.SNAP,
              delay: i * 0.05,
              ease: [0.4, 0.0, 0.2, 1],
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-6 border-3 border-concrete-black dark:border-concrete-white overflow-hidden",
        className
      )}
    >
      <motion.div
        className={cn("h-full", variantColors[variant])}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{
          duration: PRECISION_TIMING.BASE,
          ease: [0.4, 0.0, 0.2, 1],
        }}
      />
    </div>
  );
}
