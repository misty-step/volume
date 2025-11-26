"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useMemo, useState, useRef, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  QuickLogForm,
  QuickLogFormHandle,
} from "@/components/dashboard/quick-log-form";
import { GroupedSetHistory } from "@/components/dashboard/grouped-set-history";
import { FirstRunExperience } from "@/components/dashboard/first-run-experience";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { handleMutationError } from "@/lib/error-handler";
import { PageLayout } from "@/components/layout/page-layout";
import { LAYOUT } from "@/lib/layout-constants";
import { BrutalistCard } from "@/components/brutalist";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/brutalist-motion";
import { groupSetsByExercise } from "@/lib/exercise-grouping";
import { sortExercisesByRecency } from "@/lib/exercise-sorting";
import { getTodayRange } from "@/lib/date-utils";
import type { Exercise, Set as WorkoutSet } from "@/types/domain";

export function Dashboard() {
  const { isLoaded: isClerkLoaded, userId } = useAuth();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const formRef = useRef<QuickLogFormHandle>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const { unit } = useWeightUnit();

  // Calculate today's date range for filtered query
  const { start, end } = getTodayRange();

  // Fetch data from Convex - only today's sets (server-side filtering)
  const todaysSets = useQuery(api.sets.listSetsForDateRange, {
    startDate: start,
    endDate: end,
  });
  const exercises = useQuery(api.exercises.listExercises, {
    includeDeleted: true,
  });

  // Treat data as trustworthy only once Clerk + Convex both agree the user is authenticated
  const authReady =
    isClerkLoaded && Boolean(userId) && !isConvexAuthLoading && isAuthenticated;

  // Hydration guard - ensure data is stable before showing content
  // Waits for one full render cycle after queries resolve to prevent flashing empty states

  useEffect(() => {
    if (
      authReady &&
      todaysSets !== undefined &&
      exercises !== undefined &&
      !isHydrated
    ) {
      // Use RAF to ensure React completes render cycle with stable data
      requestAnimationFrame(() => {
        setIsHydrated(true);
      });
    }
  }, [authReady, todaysSets, exercises, isHydrated]);

  // Delete set mutation
  const deleteSet = useMutation(api.sets.deleteSet);

  // Group today's sets by exercise for workout view
  const exerciseGroups = useMemo(
    () => groupSetsByExercise(todaysSets, unit),
    [todaysSets, unit]
  );

  // Build exercise Map for O(1) lookups (fixes BACKLOG #11)
  const exerciseMap: Map<Id<"exercises">, Exercise> = useMemo(
    () => new Map((exercises ?? []).map((ex: any) => [ex._id, ex])),
    [exercises]
  );

  // Sort exercises by recency (most recently used first)
  // Note: Uses todaysSets for recency - exercises used today appear first
  const exercisesByRecency = useMemo(
    () => sortExercisesByRecency(exercises, todaysSets),
    [exercises, todaysSets]
  );

  // Filter to active exercises only for QuickLogForm
  const activeExercisesByRecency = useMemo(
    () => exercisesByRecency?.filter((ex) => ex.deletedAt === undefined),
    [exercisesByRecency]
  );

  // Handle delete set
  const handleDeleteSet = async (setId: Id<"sets">) => {
    try {
      await deleteSet({ id: setId });
    } catch (error) {
      handleMutationError(error, "Delete Set");
    }
  };

  // Handle repeat set
  const handleRepeatSet = (set: WorkoutSet) => {
    formRef.current?.repeatSet(set);
  };

  // Handle set logged - scroll to history
  const handleSetLogged = () => {
    // 100ms delay ensures React finishes rendering the newly logged set
    // in the history section before scrolling to it
    setTimeout(() => {
      historyRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 100);
  };

  // Handle undo - delete the set (called from toast action)
  const handleUndo = async (setId: Id<"sets">) => {
    try {
      await deleteSet({ id: setId });
    } catch (error) {
      handleMutationError(error, "Undo Set");
    }
  };

  // Loading state - show skeleton until data is stable
  if (!isHydrated) {
    return (
      <PageLayout title="Dashboard">
        <motion.div
          className={LAYOUT.section.spacing}
          variants={motionPresets.listStagger}
          initial="initial"
          animate="animate"
        >
          {/* Form skeleton */}
          <motion.div variants={motionPresets.cardEntrance}>
            <BrutalistCard className="p-6">
              <div className="space-y-4">
                <div className="h-8 w-32 bg-concrete-gray animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-12 border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse" />
                  <div className="h-12 border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse" />
                  <div className="h-12 border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse" />
                  <div className="h-12 border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse" />
                </div>
              </div>
            </BrutalistCard>
          </motion.div>

          {/* History skeleton */}
          <motion.div variants={motionPresets.cardEntrance}>
            <BrutalistCard className="p-6">
              <div className="space-y-4">
                <div className="h-8 w-48 bg-concrete-gray animate-pulse font-mono" />
                <div className="space-y-3">
                  <div className="h-24 border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse" />
                  <div className="h-24 border-3 border-concrete-black dark:border-concrete-white bg-background animate-pulse" />
                </div>
              </div>
            </BrutalistCard>
          </motion.div>
        </motion.div>
      </PageLayout>
    );
  }

  // Type guard - by this point, isHydrated is true, so both queries must be defined
  // This satisfies TypeScript's type narrowing
  if (todaysSets === undefined || exercises === undefined) {
    return null; // Should never happen, but required for type safety
  }

  // Handle first exercise created - auto-select it and focus form
  const handleFirstExerciseCreated = (exerciseId: Id<"exercises">) => {
    // 100ms delay waits for React to render the new exercise in the dropdown
    // before auto-selecting it via repeatSet with a dummy set
    setTimeout(() => {
      formRef.current?.repeatSet({
        _id: "" as Id<"sets">,
        exerciseId,
        reps: 0,
        performedAt: Date.now(),
      });
    }, 100);
  };

  return (
    <>
      <PageLayout title="Today">
        {exercises.length === 0 ? (
          /* First Run Experience - Show when no exercises exist */
          <FirstRunExperience onExerciseCreated={handleFirstExerciseCreated} />
        ) : (
          <motion.div
            className={LAYOUT.section.spacing}
            variants={motionPresets.listStagger}
            initial="initial"
            animate="animate"
          >
            {/* Quick Log Form - PRIME POSITION */}
            <motion.div variants={motionPresets.cardEntrance}>
              <QuickLogForm
                ref={formRef}
                exercises={activeExercisesByRecency}
                onSetLogged={handleSetLogged}
                onUndo={handleUndo}
              />
            </motion.div>

            {/* Today's Set History - Aggregated stats with drill-down */}
            <motion.div variants={motionPresets.cardEntrance}>
              <GroupedSetHistory
                ref={historyRef}
                exerciseGroups={exerciseGroups}
                exerciseMap={exerciseMap}
                onRepeat={handleRepeatSet}
                onDelete={handleDeleteSet}
                isLoading={!isHydrated}
              />
            </motion.div>
          </motion.div>
        )}
      </PageLayout>
    </>
  );
}
