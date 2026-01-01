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
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { handleMutationError } from "@/lib/error-handler";
import { PageLayout } from "@/components/layout/page-layout";
import { LAYOUT } from "@/lib/layout-constants";
import { BrutalistCard } from "@/components/brutalist";
import { motion, AnimatePresence } from "framer-motion";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { cn } from "@/lib/utils";
import { motionPresets } from "@/lib/brutalist-motion";
import { groupSetsByExercise } from "@/lib/exercise-grouping";
import { sortExercisesByRecency } from "@/lib/exercise-sorting";
import { getTodayRange } from "@/lib/date-utils";
import type { Exercise, Set as WorkoutSet } from "@/types/domain";
import { Plus, X } from "lucide-react";
import { DailyTotalsBanner } from "@/components/dashboard/DailyTotalsBanner";

export function Dashboard() {
  const { isLoaded: isClerkLoaded, userId } = useAuth();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const formRef = useRef<QuickLogFormHandle>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const { unit } = useWeightUnit();
  const isMobile = useMobileViewport();
  const [formOpen, setFormOpen] = useState(false);

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
  const exerciseMap: Map<Id<"exercises">, Exercise> = useMemo(() => {
    if (!exercises) return new Map();
    return new Map(exercises.map((ex) => [ex._id, ex]));
  }, [exercises]);

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

  // Handle set logged - scroll to history (mobile: also close modal)
  const handleSetLogged = () => {
    // Mobile: close form modal after successful log
    if (isMobile) {
      setFormOpen(false);
    }

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
  // Uses DashboardSkeleton component that mirrors actual content structure
  // to prevent Content Layout Shift (CLS) during hydration
  if (!isHydrated) {
    return (
      <PageLayout title="Dashboard">
        <DashboardSkeleton />
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
      <PageLayout title={isMobile ? undefined : "Today"} fullHeight={isMobile}>
        {exercises.length === 0 ? (
          /* First Run Experience - Show when no exercises exist */
          <FirstRunExperience onExerciseCreated={handleFirstExerciseCreated} />
        ) : isMobile ? (
          /* Mobile Layout: FAB + Modal (history fully visible when form closed) */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Daily Totals Banner - sticky at top on mobile */}
            <DailyTotalsBanner
              todaysSets={todaysSets}
              preferredUnit={unit}
              className="sticky top-0 z-20"
            />

            {/* History section - full screen access when form modal closed */}
            <motion.div
              className="flex-1 overflow-y-auto pb-20"
              variants={motionPresets.cardEntrance}
              initial="initial"
              animate="animate"
            >
              <GroupedSetHistory
                ref={historyRef}
                exerciseGroups={exerciseGroups}
                exerciseMap={exerciseMap}
                onRepeat={handleRepeatSet}
                onDelete={handleDeleteSet}
                isLoading={!isHydrated}
                isMobile={isMobile}
              />
            </motion.div>

            {/* FAB - Floating Action Button (bottom-right, above nav) */}
            <motion.button
              onClick={() => setFormOpen(true)}
              aria-label="Log new set"
              className={cn(
                "fixed bottom-24 right-4 z-30",
                "w-16 h-16 rounded-full",
                "bg-danger-red border-3 border-concrete-black",
                "flex items-center justify-center",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                "active:translate-x-[2px] active:translate-y-[2px]",
                "transition-all duration-75"
              )}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Plus className="w-8 h-8 text-white" strokeWidth={3} />
            </motion.button>

            {/* Modal - slides up from bottom like garage door */}
            <AnimatePresence>
              {formOpen && (
                <>
                  {/* Backdrop with concrete texture */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setFormOpen(false)}
                    className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
                  />

                  {/* Modal content - mechanical slide-up animation */}
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{
                      type: "spring",
                      damping: 30,
                      stiffness: 300,
                    }}
                    className={cn(
                      "fixed bottom-0 left-0 right-0 z-50",
                      "bg-background border-t-3 border-concrete-black dark:border-concrete-white",
                      "max-h-[90vh] overflow-y-auto",
                      "pb-safe"
                    )}
                  >
                    {/* Close button - top-right corner */}
                    <button
                      onClick={() => setFormOpen(false)}
                      className="absolute top-4 right-4 z-10 p-2 text-safety-orange hover:text-danger-red transition-colors"
                    >
                      <X className="w-6 h-6" strokeWidth={3} />
                    </button>

                    {/* Form */}
                    <div className="p-6 pt-12 pb-28">
                      <QuickLogForm
                        ref={formRef}
                        exercises={activeExercisesByRecency}
                        todaysSets={todaysSets}
                        onSetLogged={handleSetLogged}
                        onUndo={handleUndo}
                      />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Desktop Layout: Original card-based stacked layout */
          <motion.div
            className={LAYOUT.section.spacing}
            variants={motionPresets.listStagger}
            initial="initial"
            animate="animate"
          >
            {/* Daily Totals Banner - above form on desktop */}
            <motion.div variants={motionPresets.cardEntrance}>
              <DailyTotalsBanner todaysSets={todaysSets} preferredUnit={unit} />
            </motion.div>

            {/* Quick Log Form - PRIME POSITION */}
            <motion.div variants={motionPresets.cardEntrance}>
              <QuickLogForm
                ref={formRef}
                exercises={activeExercisesByRecency}
                todaysSets={todaysSets}
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
