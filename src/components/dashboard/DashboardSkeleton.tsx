"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LAYOUT } from "@/lib/layout-constants";
import { motionPresets } from "@/lib/brutalist-motion";
import { cn } from "@/lib/utils";

// Extracted skeleton class constants for maintainability
const pulseBox = "bg-concrete-gray animate-pulse";
const pulseInput =
  "border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse";
const pulseButton =
  "border-3 border-concrete-black dark:border-concrete-white animate-pulse";

interface DashboardSkeletonProps {
  /** Render mobile layout (banner + history + FAB) vs desktop (banner + form + history) */
  isMobile?: boolean;
}

/**
 * DashboardSkeleton - Loading skeleton that mirrors actual Dashboard structure.
 *
 * Desktop structure (default):
 * 1. Daily totals banner
 * 2. Form card with mode toggle, exercise selector, inputs, submit button
 * 3. History card with grouped exercises
 *
 * Mobile structure (isMobile=true):
 * 1. Sticky daily totals banner
 * 2. History list (no card wrapper)
 * 3. FAB placeholder
 *
 * Note: WorkoutContextCarousel is NOT included because it only renders
 * when an exercise is selected, which doesn't happen during initial load.
 *
 * This prevents Content Layout Shift (CLS) during hydration.
 *
 * @see Issue #150 - Loading skeleton structure doesn't match content
 */
export function DashboardSkeleton({
  isMobile = false,
}: DashboardSkeletonProps) {
  // Mobile skeleton: sticky banner + history + FAB (no form card)
  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Daily Totals Banner - sticky at top on mobile */}
        <div
          className={cn(
            "sticky top-0 z-20",
            "flex items-center justify-between py-3 px-4",
            "border-b-3 border-concrete-black dark:border-concrete-white bg-background"
          )}
        >
          <div className="flex gap-6">
            <div className={cn("h-5 w-20", pulseBox)} />
            <div className={cn("h-5 w-24", pulseBox)} />
          </div>
        </div>

        {/* History section - no card wrapper on mobile */}
        <motion.div
          className="flex-1 overflow-y-auto pb-20"
          variants={motionPresets.cardEntrance}
          initial="initial"
          animate="animate"
        >
          <div className="space-y-3 p-4">
            {/* Exercise group skeleton items */}
            <div className={cn("p-3", pulseInput)}>
              <div className="flex items-center justify-between">
                <div className={cn("h-5 w-32", pulseBox)} />
                <div className={cn("h-5 w-16", pulseBox)} />
              </div>
            </div>
            <div className={cn("p-3", pulseInput)}>
              <div className="flex items-center justify-between">
                <div className={cn("h-5 w-24", pulseBox)} />
                <div className={cn("h-5 w-12", pulseBox)} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAB skeleton - bottom-right, above nav */}
        <div
          className={cn(
            "fixed bottom-24 right-4 z-30",
            "w-16 h-16 rounded-full",
            "bg-danger-red/30 border-3 border-concrete-black",
            "animate-pulse"
          )}
        />
      </div>
    );
  }

  // Desktop skeleton: banner + form card + history card
  return (
    <motion.div
      className={LAYOUT.section.spacing}
      variants={motionPresets.listStagger}
      initial="initial"
      animate="animate"
    >
      {/* Daily Totals Banner skeleton */}
      <motion.div variants={motionPresets.cardEntrance}>
        <div
          className={cn(
            "flex items-center justify-between py-3 px-4",
            pulseInput
          )}
        >
          <div className="flex gap-6">
            <div className={cn("h-5 w-20", pulseBox)} />
            <div className={cn("h-5 w-24", pulseBox)} />
          </div>
        </div>
      </motion.div>

      {/* Form skeleton - matches QuickLogForm structure */}
      <motion.div variants={motionPresets.cardEntrance}>
        <Card className="p-6">
          {/* Form header */}
          <div className={cn("h-8 w-24 mb-6", pulseBox)} />

          <div className="space-y-4">
            {/* Mode toggle skeleton (2 buttons: Reps/Duration) */}
            <div className="flex items-center gap-3">
              <div
                className={cn("h-10 w-20", pulseButton, "bg-danger-red/20")}
              />
              <div className={cn("h-10 w-24", pulseButton, "bg-background")} />
            </div>

            {/* Exercise selector skeleton (full width) */}
            <div className="space-y-1">
              <div className={cn("h-4 w-20", pulseBox)} />
              <div className={cn("h-12 w-full", pulseInput)} />
            </div>

            {/* Note: No WorkoutContextCarousel placeholder - it only shows when exercise is selected */}

            {/* Input row skeleton: Reps + Weight */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
              {/* Reps input */}
              <div className="md:col-span-3 space-y-1">
                <div className={cn("h-4 w-12", pulseBox)} />
                <div className={cn("h-12", pulseInput)} />
              </div>

              {/* Weight input */}
              <div className="md:col-span-3 space-y-1">
                <div className={cn("h-4 w-20", pulseBox)} />
                <div className={cn("h-12", pulseInput)} />
              </div>
            </div>

            {/* Submit button skeleton */}
            <div className="pt-6 md:flex md:justify-end">
              <div
                className={cn(
                  "h-12 w-full md:w-64",
                  pulseButton,
                  "bg-danger-red/30"
                )}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* History skeleton - matches GroupedSetHistory structure */}
      <motion.div variants={motionPresets.cardEntrance}>
        <Card className="p-6">
          {/* Header */}
          <div className={cn("h-6 w-32 mb-4", pulseBox)} />

          {/* Exercise group skeleton items */}
          <div className="space-y-3">
            <div className={pulseInput}>
              <div className="flex items-center justify-between p-3">
                <div className={cn("h-5 w-32", pulseBox)} />
                <div className={cn("h-5 w-16", pulseBox)} />
              </div>
            </div>

            <div className={pulseInput}>
              <div className="flex items-center justify-between p-3">
                <div className={cn("h-5 w-24", pulseBox)} />
                <div className={cn("h-5 w-12", pulseBox)} />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
