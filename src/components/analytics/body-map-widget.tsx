"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Model, {
  type IExerciseData,
  type IMuscleStats,
  type Muscle,
} from "react-body-highlighter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import type {
  RecoveryData,
  MuscleGroup,
  RecoveryStatus,
} from "../../../convex/analyticsRecovery";

/**
 * Sentinel value indicating a muscle group has never been trained.
 * Used by analyticsRecovery.getRecoveryStatus when no workout data exists.
 */
const NEVER_TRAINED_SENTINEL = 999;

/**
 * Map our muscle group names to react-body-highlighter muscle IDs
 *
 * Library muscles (anterior): chest, abs, obliques, biceps, forearm, front-deltoids, quadriceps, adductor
 * Library muscles (posterior): trapezius, upper-back, lower-back, triceps, back-deltoids, hamstring, calves, gluteal, abductors
 */
const MUSCLE_GROUP_MAP: Record<MuscleGroup, Muscle[]> = {
  Chest: ["chest"],
  Back: ["trapezius", "upper-back", "lower-back"],
  Shoulders: ["front-deltoids", "back-deltoids"],
  Biceps: ["biceps"],
  Triceps: ["triceps"],
  Quads: ["quadriceps"],
  Hamstrings: ["hamstring"],
  Glutes: ["gluteal"],
  Calves: ["calves"],
  Core: ["abs", "obliques"],
  Other: [], // Not displayed
};

/**
 * Reverse map: library muscle ID → our muscle group name
 */
const REVERSE_MUSCLE_MAP: Record<Muscle, MuscleGroup> = {} as Record<
  Muscle,
  MuscleGroup
>;
for (const [group, muscles] of Object.entries(MUSCLE_GROUP_MAP)) {
  for (const muscle of muscles) {
    REVERSE_MUSCLE_MAP[muscle] = group as MuscleGroup;
  }
}

/**
 * Colors for recovery status
 * - Gray: Recovering (0-2 days) or never trained
 * - Safety Orange: Ready to train (3-7 days)
 * - Danger Red: Overdue (8+ days)
 *
 * Note: Gray lightened from #6B7280 to #9CA3AF for WCAG AA compliance
 * in dark mode (4.5:1 contrast ratio against black background).
 */
const STATUS_COLORS: Record<RecoveryStatus | "never", string> = {
  recovering: "#9CA3AF", // Gray - still resting (WCAG AA compliant)
  ready: "#FF6B00", // Safety Orange - go train!
  overdue: "#C41E3A", // Danger Red - neglected
  never: "#6B7280", // Darker gray for never trained
};

interface BodyMapWidgetProps {
  isLoading?: boolean;
}

interface MuscleDetail {
  muscleGroup: MuscleGroup;
  status: RecoveryStatus;
  daysSince: number;
  lastTrainedDate: string | null;
  volumeLast7Days: number;
  frequencyLast7Days: number;
}

/**
 * Body Map Widget
 *
 * Visual muscle group recovery status using SVG body outline.
 * Replaces RecoveryDashboardWidget and FocusSuggestionsWidget.
 *
 * Features:
 * - Front/back view toggle
 * - Heat colors by recovery status
 * - Tap muscle → detail popover with "Train Now" action
 */
export function BodyMapWidget({
  isLoading: isLoadingProp = false,
}: BodyMapWidgetProps) {
  const [view, setView] = useState<"anterior" | "posterior">("anterior");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleDetail | null>(
    null
  );
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Query recovery status
  const recoveryData = useQuery(api.analyticsRecovery.getRecoveryStatus, {});
  const isLoading = isLoadingProp || recoveryData === undefined;

  // Create lookup map for quick access
  const recoveryMap = useMemo(() => {
    if (!recoveryData) return new Map<MuscleGroup, RecoveryData>();
    return new Map(recoveryData.map((d) => [d.muscleGroup, d]));
  }, [recoveryData]);

  /**
   * Transform recovery data into library's exercise data format
   *
   * We abuse the "exercise" concept - each muscle group becomes a fake exercise
   * with frequency based on status (higher = more intense color)
   */
  const modelData: IExerciseData[] = useMemo(() => {
    if (!recoveryData) return [];

    const exercises: IExerciseData[] = [];

    for (const data of recoveryData) {
      const libraryMuscles = MUSCLE_GROUP_MAP[data.muscleGroup];
      if (!libraryMuscles || libraryMuscles.length === 0) continue;

      // Map status to frequency (used for color selection)
      // The library uses highlightedColors[frequency-1], so:
      // frequency 1 = recovering (gray)
      // frequency 2 = ready (orange)
      // frequency 3 = overdue (red)
      let frequency: number;
      if (data.daysSince === NEVER_TRAINED_SENTINEL) {
        frequency = 1; // Never trained = gray
      } else if (data.status === "recovering") {
        frequency = 1;
      } else if (data.status === "ready") {
        frequency = 2;
      } else {
        frequency = 3; // overdue
      }

      exercises.push({
        name: data.muscleGroup,
        muscles: libraryMuscles,
        frequency,
      });
    }

    return exercises;
  }, [recoveryData]);

  /**
   * Handle muscle click - show detail popover
   */
  const handleMuscleClick = useCallback(
    ({ muscle }: IMuscleStats) => {
      const ourGroup = REVERSE_MUSCLE_MAP[muscle];
      if (!ourGroup) return;

      const data = recoveryMap.get(ourGroup);
      if (!data) return;

      setSelectedMuscle({
        muscleGroup: data.muscleGroup,
        status: data.status,
        daysSince: data.daysSince,
        lastTrainedDate: data.lastTrainedDate,
        volumeLast7Days: data.volumeLast7Days,
        frequencyLast7Days: data.frequencyLast7Days,
      });
      setPopoverOpen(true);
    },
    [recoveryMap]
  );

  /**
   * Get status label and color for display
   */
  const getStatusDisplay = (status: RecoveryStatus, daysSince: number) => {
    if (daysSince === NEVER_TRAINED_SENTINEL) {
      return {
        label: "Never trained",
        color: "text-muted-foreground",
        bg: "bg-muted",
      };
    }
    switch (status) {
      case "recovering":
        return {
          label: "Recovering",
          color: "text-concrete-gray",
          bg: "bg-concrete-gray/10",
        };
      case "ready":
        return {
          label: "Ready",
          color: "text-safety-orange",
          bg: "bg-safety-orange/10",
        };
      case "overdue":
        return {
          label: "Overdue",
          color: "text-danger-red",
          bg: "bg-danger-red/10",
        };
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <CardTitle>Recovery Map</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-80 animate-pulse">
            <div className="w-48 h-64 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state (no workout data at all)
  const hasAnyData =
    recoveryData &&
    recoveryData.some((d) => d.daysSince !== NEVER_TRAINED_SENTINEL);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-safety-orange" />
            <CardTitle>Recovery Map</CardTitle>
          </div>
          {/* Front/Back Toggle - 44px touch targets per TASK.md spec */}
          <div className="flex gap-1">
            <Button
              variant={view === "anterior" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("anterior")}
              className="h-11 px-4 text-sm"
            >
              Front
            </Button>
            <Button
              variant={view === "posterior" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("posterior")}
              className="h-11 px-4 text-sm"
            >
              Back
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnyData ? (
          // Empty state for new users
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-2">
              Start logging to see recovery
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Your body map will show which muscles are ready to train based on
              your workout history.
            </p>
            <Button asChild size="sm">
              <Link href="/today">
                Log First Workout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Body Map */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="flex justify-center cursor-pointer">
                  <Model
                    data={modelData}
                    type={view}
                    bodyColor="#374151" // Dark gray default
                    highlightedColors={[
                      STATUS_COLORS.recovering, // frequency 1
                      STATUS_COLORS.ready, // frequency 2
                      STATUS_COLORS.overdue, // frequency 3
                    ]}
                    onClick={handleMuscleClick}
                    style={{ width: "14rem", maxWidth: "100%" }}
                    svgStyle={{
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                    }}
                  />
                </div>
              </PopoverTrigger>

              {/* Muscle Detail Popover */}
              {selectedMuscle && (
                <PopoverContent className="w-64 p-0" align="center">
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base">
                        {selectedMuscle.muscleGroup}
                      </h3>
                      {(() => {
                        const display = getStatusDisplay(
                          selectedMuscle.status,
                          selectedMuscle.daysSince
                        );
                        return (
                          <span
                            className={`text-xs px-2 py-0.5 font-mono uppercase tracking-wide border-2 font-medium ${display.bg} ${display.color}`}
                          >
                            {display.label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Stats */}
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Days since:
                        </span>
                        <span className="font-medium tabular-nums">
                          {selectedMuscle.daysSince === NEVER_TRAINED_SENTINEL
                            ? "—"
                            : selectedMuscle.daysSince}
                        </span>
                      </div>
                      {selectedMuscle.lastTrainedDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Last trained:
                          </span>
                          <span className="font-medium">
                            {new Date(
                              selectedMuscle.lastTrainedDate
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      {selectedMuscle.volumeLast7Days > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Volume (7d):
                          </span>
                          <span className="font-medium tabular-nums">
                            {selectedMuscle.volumeLast7Days >= 1000
                              ? `${(selectedMuscle.volumeLast7Days / 1000).toFixed(1)}k`
                              : selectedMuscle.volumeLast7Days.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {selectedMuscle.frequencyLast7Days > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Sessions (7d):
                          </span>
                          <span className="font-medium tabular-nums">
                            {selectedMuscle.frequencyLast7Days}x
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    {selectedMuscle.status !== "recovering" && (
                      <Button asChild size="sm" className="w-full">
                        <Link href="/today">
                          Train Now
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              )}
            </Popover>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border-2"
                    style={{ backgroundColor: STATUS_COLORS.recovering }}
                  />
                  <span>Recovering (0-2d)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border-2"
                    style={{ backgroundColor: STATUS_COLORS.ready }}
                  />
                  <span>Ready (3-7d)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border-2"
                    style={{ backgroundColor: STATUS_COLORS.overdue }}
                  />
                  <span>Overdue (8+d)</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
