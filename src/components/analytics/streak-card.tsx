"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/brutalist-motion";
import { BRUTALIST_TYPOGRAPHY } from "@/config/design-tokens";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  isLoading?: boolean;
}

export function StreakCard({
  currentStreak,
  longestStreak,
  totalWorkouts,
  isLoading = false,
}: StreakCardProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="p-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5" />
            <CardTitle>Workout Streak</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-concrete-gray/20" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 bg-concrete-gray/20" />
              <div className="h-12 bg-concrete-gray/20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (currentStreak === 0 && longestStreak === 0 && totalWorkouts === 0) {
    return (
      <Card className="p-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5" />
            <CardTitle>Workout Streak</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Flame className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Start your streak today!
            </p>
            <p className="text-xs text-muted-foreground">
              Log workouts daily to build momentum
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flame
            className={`w-5 h-5 ${currentStreak > 0 ? "text-safety-orange" : ""}`}
          />
          <CardTitle className="">Workout Streak</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Streak - Prominent Display */}
          <div className="text-center p-4 bg-muted/50 border-3 border-concrete-black dark:border-concrete-white">
            <motion.div
              className="flex items-center justify-center gap-2 mb-1"
              variants={motionPresets.numberReveal}
              initial="initial"
              animate="animate"
            >
              <span
                className={BRUTALIST_TYPOGRAPHY.pairings.dashboardStat.number}
              >
                {currentStreak}
              </span>
              <span
                className={BRUTALIST_TYPOGRAPHY.pairings.dashboardStat.label}
              >
                day{currentStreak !== 1 ? "s" : ""}
              </span>
            </motion.div>
            <p className={BRUTALIST_TYPOGRAPHY.pairings.dashboardStat.label}>
              Current Streak
            </p>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-3">
            {/* Longest Streak */}
            <div className="text-center p-3 border-3 border-concrete-black dark:border-concrete-white">
              <motion.div
                className={`${BRUTALIST_TYPOGRAPHY.pairings.analyticsMetric.number} mb-1`}
                variants={motionPresets.numberReveal}
                initial="initial"
                animate="animate"
              >
                {longestStreak}
              </motion.div>
              <div
                className={BRUTALIST_TYPOGRAPHY.pairings.analyticsMetric.label}
              >
                Longest
              </div>
              <div
                className={BRUTALIST_TYPOGRAPHY.pairings.analyticsMetric.label}
              >
                Streak
              </div>
            </div>

            {/* Total Workouts */}
            <div className="text-center p-3 border-3 border-concrete-black dark:border-concrete-white">
              <motion.div
                className={`${BRUTALIST_TYPOGRAPHY.pairings.analyticsMetric.number} mb-1`}
                variants={motionPresets.numberReveal}
                initial="initial"
                animate="animate"
              >
                {totalWorkouts}
              </motion.div>
              <div
                className={BRUTALIST_TYPOGRAPHY.pairings.analyticsMetric.label}
              >
                Total
              </div>
              <div
                className={BRUTALIST_TYPOGRAPHY.pairings.analyticsMetric.label}
              >
                Workouts
              </div>
            </div>
          </div>

          {/* Encouragement Message */}
          {currentStreak === 0 && longestStreak > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Your best was {longestStreak} days. Start a new streak today!
            </p>
          )}
          {currentStreak > 0 && currentStreak === longestStreak && (
            <p className="text-xs text-center text-muted-foreground">
              You&apos;re on your longest streak ever!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
