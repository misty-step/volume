"use client";

import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { Exercise, Set, WeightUnit } from "@/types/domain";
import { ExerciseSetGroup, type DeletedSetData } from "./exercise-set-group";
import { groupSetsByExercise } from "@/lib/exercise-grouping";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/brutalist-motion";
import { formatNumber } from "@/lib/number-utils";
import { formatDuration } from "@/lib/date-utils";

interface DayGroup {
  date: string;
  displayDate: string;
  sets: Set[];
  /** Optional pre-computed totals from useDayPagedHistory */
  totals?: {
    setCount: number;
    reps: number;
    durationSec: number;
    volume: number;
  };
}

interface ChronologicalGroupedSetHistoryProps {
  groupedSets: DayGroup[];
  exerciseMap: Map<Id<"exercises">, Exercise>;
  onRepeat: (set: Set) => void;
  onDelete: (setId: Id<"sets">) => void;
  /** Called when user clicks undo in toast - recreates the deleted set */
  onUndoDelete?: (setData: DeletedSetData) => void;
  showRepeat?: boolean;
  /** When true, exercise names become links to exercise detail page */
  linkExercises?: boolean;
  /** Preferred weight unit for displaying volume */
  preferredUnit?: WeightUnit;
}

/**
 * Displays workout history grouped chronologically by day,
 * with exercise groups within each day using collapsible UI.
 *
 * Combines the chronological mental model (day-by-day timeline)
 * with the modern collapsible exercise group pattern.
 */
export function ChronologicalGroupedSetHistory({
  groupedSets,
  exerciseMap,
  onRepeat,
  onDelete,
  onUndoDelete,
  showRepeat = false,
  linkExercises = false,
  preferredUnit: preferredUnitProp,
}: ChronologicalGroupedSetHistoryProps) {
  const { unit: contextUnit } = useWeightUnit();
  const preferredUnit = preferredUnitProp ?? contextUnit;

  // Empty state
  if (groupedSets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm mb-2">
              No sets logged yet
            </p>
            <p className="text-sm mb-1">Start your journey! 🚀</p>
            <p className="text-muted-foreground text-xs mt-2">
              Log your first set above
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      className="space-y-3"
      variants={motionPresets.listStagger}
      initial="initial"
      animate="animate"
    >
      {groupedSets.map((dayGroup) => {
        // Transform day's sets into exercise groups
        const exerciseGroups = groupSetsByExercise(
          dayGroup.sets,
          preferredUnit
        );

        // Use pre-computed totals if available, otherwise compute from exercise groups
        const totals = dayGroup.totals ?? {
          setCount: dayGroup.sets.length,
          reps: exerciseGroups.reduce((sum, g) => sum + g.metrics.totalReps, 0),
          durationSec: exerciseGroups.reduce(
            (sum, g) => sum + g.metrics.totalDuration,
            0
          ),
          volume: exerciseGroups.reduce(
            (sum, g) => sum + g.metrics.totalVolume,
            0
          ),
        };

        return (
          <motion.div key={dayGroup.date} variants={motionPresets.cardEntrance}>
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex flex-col gap-1">
                  <span>{dayGroup.displayDate}</span>
                  <span className="font-mono text-xs text-muted-foreground font-normal flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      {totals.setCount} set{totals.setCount === 1 ? "" : "s"}
                    </span>
                    {totals.volume > 0 && (
                      <span>
                        {formatNumber(Math.round(totals.volume))}{" "}
                        {preferredUnit}
                      </span>
                    )}
                    {totals.volume === 0 && totals.reps > 0 && (
                      <span>{formatNumber(totals.reps)} reps</span>
                    )}
                    {totals.durationSec > 0 && (
                      <span>{formatDuration(totals.durationSec)}</span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="space-y-3"
                  variants={motionPresets.listStagger}
                >
                  {exerciseGroups.map((group) => {
                    const exercise = exerciseMap.get(group.exerciseId);
                    if (!exercise) return null;

                    return (
                      <motion.div
                        key={group.exerciseId}
                        variants={motionPresets.cardEntrance}
                      >
                        <ExerciseSetGroup
                          exercise={exercise}
                          sets={group.sets}
                          metrics={group.metrics}
                          preferredUnit={preferredUnit}
                          onRepeat={onRepeat}
                          onDelete={onDelete}
                          onUndoDelete={onUndoDelete}
                          showRepeat={showRepeat}
                          exerciseHref={
                            linkExercises
                              ? `/history/exercise/${group.exerciseId}`
                              : undefined
                          }
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
