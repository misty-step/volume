"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";

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
      <Card className="">
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
      <Card className="">
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
    <Card className="">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flame
            className={`w-5 h-5 ${currentStreak > 0 ? "text-orange-500 dark:text-orange-400" : ""}`}
          />
          <CardTitle className="">Workout Streak</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Streak - Prominent Display */}
          <div className="text-center p-4 bg-muted/50 border-2 border-border">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-4xl font-bold tabular-nums">
                {currentStreak}
              </span>
              <span className="text-lg text-muted-foreground">
                day{currentStreak !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-sm font-medium">Current Streak</p>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-3">
            {/* Longest Streak */}
            <div className="text-center p-3 border-2 border-border">
              <div className="text-2xl font-bold tabular-nums mb-1">
                {longestStreak}
              </div>
              <div className="text-xs text-muted-foreground">Longest</div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </div>

            {/* Total Workouts */}
            <div className="text-center p-3 border-2 border-border">
              <div className="text-2xl font-bold tabular-nums mb-1">
                {totalWorkouts}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xs text-muted-foreground">Workouts</div>
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
