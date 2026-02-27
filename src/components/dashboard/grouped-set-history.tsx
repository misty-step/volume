"use client";

import { forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Id } from "../../../convex/_generated/dataModel";
import { BrutalistCard } from "@/components/brutalist";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import type { ExerciseGroup } from "@/lib/exercise-grouping";
import { type Exercise, type Set as WorkoutSet } from "@/types/domain";
import { ExerciseSetGroup, type DeletedSetData } from "./exercise-set-group";
import { Dumbbell } from "lucide-react";

interface GroupedSetHistoryProps {
  exerciseGroups: ExerciseGroup[];
  exerciseMap: Map<Id<"exercises">, Exercise>;
  onRepeat: (set: WorkoutSet) => void;
  onDelete: (setId: Id<"sets">) => void;
  /** Called when user clicks undo in toast - recreates the deleted set */
  onUndoDelete?: (setData: DeletedSetData) => void;
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
    onUndoDelete,
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
    // Mobile: "Ghost Card" placeholder
    if (isMobile) {
      return (
        <div
          ref={ref}
          className="flex flex-col items-center justify-center flex-1 px-8 py-12"
        >
          <div className="w-full max-w-xs border-4 border-dashed border-concrete-gray/20 rounded-lg p-8 flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-concrete-gray/10 rounded-full">
              <Dumbbell
                className="w-8 h-8 text-concrete-gray"
                strokeWidth={2}
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-display text-lg uppercase tracking-wide text-concrete-gray">
                Ready to Work?
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                Tap + to log your first set
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Desktop: "Ghost Card" inside the main card
    return (
      <BrutalistCard ref={ref} className="p-6">
        <h2 className="font-display text-2xl uppercase tracking-wide mb-6">
          Today
        </h2>
        <div className="border-4 border-dashed border-concrete-gray/20 min-h-[200px] flex flex-col items-center justify-center gap-4 bg-concrete-gray/5">
          <div className="p-4 bg-background border-3 border-concrete-black dark:border-concrete-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transform rotate-2">
            <Dumbbell
              className="w-8 h-8 text-foreground"
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>
          <div className="text-center space-y-1">
            <p className="font-display text-lg uppercase tracking-wide">
              No Activity
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              Your daily volume starts with one set.
            </p>
          </div>
        </div>
      </BrutalistCard>
    );
  }

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
              metrics={group.metrics}
              preferredUnit={preferredUnit}
              onRepeat={onRepeat}
              onDelete={onDelete}
              onUndoDelete={onUndoDelete}
            />
          </motion.div>
        );
      })}
    </AnimatePresence>
  );

  // Mobile: no card wrapper, exercise groups directly
  if (isMobile) {
    return (
      <div ref={ref}>
        <div className="space-y-3">{exerciseGroupsContent}</div>
      </div>
    );
  }

  // Desktop: card wrapper with header
  return (
    <BrutalistCard ref={ref} className="p-6">
      <h2 className="font-display text-2xl uppercase tracking-wide mb-6">
        Today
      </h2>
      <div className="space-y-3">{exerciseGroupsContent}</div>
    </BrutalistCard>
  );
});
