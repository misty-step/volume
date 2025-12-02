"use client";

import { forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Id } from "../../../convex/_generated/dataModel";
import { BrutalistCard } from "@/components/brutalist";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { Exercise, Set } from "@/types/domain";
import { ExerciseSetGroup } from "./exercise-set-group";
import { Dumbbell } from "lucide-react";

interface ExerciseGroup {
  exerciseId: Id<"exercises">;
  sets: Set[];
  totalVolume: number;
  totalReps: number;
}

interface GroupedSetHistoryProps {
  exerciseGroups: ExerciseGroup[];
  exerciseMap: Map<Id<"exercises">, Exercise>;
  onRepeat: (set: Set) => void;
  onDelete: (setId: Id<"sets">) => void;
  isLoading?: boolean;
}

export const GroupedSetHistory = forwardRef<
  HTMLDivElement,
  GroupedSetHistoryProps
>(function GroupedSetHistory(
  { exerciseGroups, exerciseMap, onRepeat, onDelete, isLoading = false },
  ref
) {
  const { unit: preferredUnit } = useWeightUnit();

  // Loading state - show skeleton while data is fetching
  if (isLoading) {
    return (
      <BrutalistCard ref={ref} className="p-6">
        <h2 className="font-display text-2xl uppercase tracking-wide mb-6">
          Today
        </h2>
        <div className="space-y-3">
          <div className="border-3 border-concrete-black dark:border-concrete-white p-4">
            <div className="h-6 w-32 bg-concrete-gray animate-pulse" />
          </div>
          <div className="border-3 border-concrete-black dark:border-concrete-white p-4">
            <div className="h-6 w-40 bg-concrete-gray animate-pulse" />
          </div>
        </div>
      </BrutalistCard>
    );
  }

  // Empty state - user has no sets logged today
  if (exerciseGroups.length === 0) {
    return (
      <BrutalistCard ref={ref} className="p-6">
        <h2 className="font-display text-2xl uppercase tracking-wide mb-6">
          Today
        </h2>
        <div className="py-12 text-center">
          <Dumbbell className="w-16 h-16 mx-auto text-concrete-gray mb-6" />
          <p className="font-mono text-sm uppercase tracking-wide text-concrete-gray mb-2">
            No sets logged yet
          </p>
          <p className="font-display text-xl uppercase tracking-wide">
            Start logging above
          </p>
        </div>
      </BrutalistCard>
    );
  }

  const totalSets = exerciseGroups.reduce(
    (sum, group) => sum + group.sets.length,
    0
  );

  return (
    <BrutalistCard ref={ref} className="p-6">
      <h2 className="font-display text-2xl uppercase tracking-wide mb-2">
        Today
      </h2>
      <p className="font-mono text-xs uppercase tracking-wider text-concrete-gray mb-6">
        {exerciseGroups.length} EXERCISE{exerciseGroups.length === 1 ? "" : "S"}
        {" • "}
        {totalSets} SET{totalSets === 1 ? "" : "S"}
      </p>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {exerciseGroups.map((group) => {
            const exercise = exerciseMap.get(group.exerciseId);
            if (!exercise) return null;

            return (
              <motion.div
                key={group.exerciseId}
                layoutId={`exercise-group-${group.exerciseId}`}
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <ExerciseSetGroup
                  exercise={exercise}
                  sets={group.sets}
                  totalVolume={group.totalVolume}
                  totalReps={group.totalReps}
                  preferredUnit={preferredUnit}
                  onRepeat={onRepeat}
                  onDelete={onDelete}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </BrutalistCard>
  );
});
