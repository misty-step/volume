"use client";

import { BrutalistCard } from "@/components/brutalist";
import { motion } from "framer-motion";
import { LAYOUT } from "@/lib/layout-constants";
import { motionPresets } from "@/lib/brutalist-motion";
import { cn } from "@/lib/utils";

/**
 * DashboardSkeleton - Loading skeleton that mirrors actual Dashboard structure.
 *
 * Structure matches QuickLogForm + GroupedSetHistory:
 * 1. Daily totals banner
 * 2. Form card with:
 *    - Mode toggle (2 buttons)
 *    - Exercise selector (full width)
 *    - WorkoutContextCarousel placeholder
 *    - Reps + Weight inputs (2 columns)
 *    - Submit button
 * 3. History card with grouped exercises
 *
 * This prevents Content Layout Shift (CLS) during hydration.
 *
 * @see Issue #150 - Loading skeleton structure doesn't match content
 */
export function DashboardSkeleton() {
  return (
    <motion.div
      className={LAYOUT.section.spacing}
      variants={motionPresets.listStagger}
      initial="initial"
      animate="animate"
    >
      {/* Daily Totals Banner skeleton */}
      <motion.div variants={motionPresets.cardEntrance}>
        <div className="flex items-center justify-between py-3 px-4 border-3 border-concrete-black dark:border-concrete-white bg-background">
          <div className="flex gap-6">
            <div className="h-5 w-20 bg-concrete-gray animate-pulse" />
            <div className="h-5 w-24 bg-concrete-gray animate-pulse" />
          </div>
        </div>
      </motion.div>

      {/* Form skeleton - matches QuickLogForm structure */}
      <motion.div variants={motionPresets.cardEntrance}>
        <BrutalistCard className="p-6">
          {/* Form header */}
          <div className="h-8 w-24 bg-concrete-gray animate-pulse mb-6" />

          <div className="space-y-4">
            {/* Mode toggle skeleton (2 buttons: Reps/Duration) */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-20 border-3 border-concrete-black dark:border-concrete-white",
                  "bg-danger-red/20 animate-pulse"
                )}
              />
              <div
                className={cn(
                  "h-10 w-24 border-3 border-concrete-black dark:border-concrete-white",
                  "bg-background animate-pulse"
                )}
              />
            </div>

            {/* Exercise selector skeleton (full width) */}
            <div className="space-y-1">
              <div className="h-4 w-20 bg-concrete-gray animate-pulse" />
              <div className="h-12 w-full border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse" />
            </div>

            {/* WorkoutContextCarousel placeholder (represents swipeable cards) */}
            <div className="h-16 w-full border-2 border-dashed border-concrete-gray/50 bg-concrete-gray/10 animate-pulse rounded" />

            {/* Input row skeleton: Reps + Weight */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
              {/* Reps input */}
              <div className="md:col-span-3 space-y-1">
                <div className="h-4 w-12 bg-concrete-gray animate-pulse" />
                <div className="h-12 border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse" />
              </div>

              {/* Weight input */}
              <div className="md:col-span-3 space-y-1">
                <div className="h-4 w-20 bg-concrete-gray animate-pulse" />
                <div className="h-12 border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse" />
              </div>
            </div>

            {/* Submit button skeleton */}
            <div className="pt-6 md:flex md:justify-end">
              <div className="h-12 w-full md:w-64 bg-danger-red/30 border-3 border-concrete-black dark:border-concrete-white animate-pulse" />
            </div>
          </div>
        </BrutalistCard>
      </motion.div>

      {/* History skeleton - matches GroupedSetHistory structure */}
      <motion.div variants={motionPresets.cardEntrance}>
        <BrutalistCard className="p-6">
          {/* Header */}
          <div className="h-6 w-32 bg-concrete-gray animate-pulse mb-4" />

          {/* Empty state or exercise groups */}
          <div className="space-y-3">
            {/* Exercise group skeleton (mimics accordion item) */}
            <div className="border-3 border-concrete-black dark:border-concrete-white">
              <div className="flex items-center justify-between p-3">
                <div className="h-5 w-32 bg-concrete-gray animate-pulse" />
                <div className="h-5 w-16 bg-concrete-gray animate-pulse" />
              </div>
            </div>

            {/* Second exercise group */}
            <div className="border-3 border-concrete-black dark:border-concrete-white">
              <div className="flex items-center justify-between p-3">
                <div className="h-5 w-24 bg-concrete-gray animate-pulse" />
                <div className="h-5 w-12 bg-concrete-gray animate-pulse" />
              </div>
            </div>
          </div>
        </BrutalistCard>
      </motion.div>
    </motion.div>
  );
}
