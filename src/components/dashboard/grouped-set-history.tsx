"use client";

import { forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Id } from "../../../convex/_generated/dataModel";
import { BrutalistCard } from "@/components/brutalist";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { Exercise, Set } from "@/types/domain";
import { ExerciseSetGroup } from "./exercise-set-group";
import { Dumbbell, ChevronDown, ChevronUp } from "lucide-react";

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
  /** Mobile layout: form is below, so empty state points down */
  isMobile?: boolean;
}

export const GroupedSetHistory = forwardRef<
  HTMLDivElement,
  GroupedSetHistoryProps
>(function GroupedSetHistory(
  {
    exerciseGroups,
    exerciseMap,
    onRepeat,
    onDelete,
    isLoading = false,
    isMobile = false,
  },
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
    // Mobile: minimal empty state, no card wrapper
    if (isMobile) {
      return (
        <div
          ref={ref}
          className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-12"
        >
          <Dumbbell
            className="w-16 h-16 text-concrete-gray/30"
            strokeWidth={1.5}
          />
          <p className="font-mono text-sm text-muted-foreground">
            No sets logged yet.
          </p>
          <ChevronDown className="h-6 w-6 animate-bounce text-safety-orange" />
        </div>
      );
    }

    // Desktop: card wrapper with header
    return (
      <BrutalistCard ref={ref} className="p-6">
        <h2 className="font-display text-2xl uppercase tracking-wide mb-6">
          Today
        </h2>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Dumbbell
            className="w-20 h-20 text-concrete-gray/40"
            strokeWidth={1.5}
          />
          <div className="text-center space-y-1">
            <p className="font-mono text-sm text-muted-foreground">
              No sets logged yet. Start above.
            </p>
          </div>
          <ChevronUp className="h-6 w-6 animate-bounce text-safety-orange" />
        </div>
      </BrutalistCard>
    );
  }

  const totalSets = exerciseGroups.reduce(
    (sum, group) => sum + group.sets.length,
    0
  );

  // Shared exercise groups content
  const exerciseGroupsContent = (
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
  );

  // Mobile: no card wrapper, compact header
  if (isMobile) {
    return (
      <div ref={ref}>
        <p className="font-mono text-xs uppercase tracking-wider text-concrete-gray mb-4">
          {exerciseGroups.length} exercise{exerciseGroups.length !== 1 && "s"}
          {" • "}
          {totalSets} set{totalSets !== 1 && "s"}
        </p>
        <div className="space-y-3">{exerciseGroupsContent}</div>
      </div>
    );
  }

  // Desktop: card wrapper with full header
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
      <div className="space-y-3">{exerciseGroupsContent}</div>
    </BrutalistCard>
  );
});
