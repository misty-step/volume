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
import { UndoToast } from "@/components/dashboard/undo-toast";
import { FirstRunExperience } from "@/components/dashboard/first-run-experience";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { handleMutationError } from "@/lib/error-handler";
import { PageLayout } from "@/components/layout/page-layout";
import { LAYOUT } from "@/lib/layout-constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { groupSetsByExercise } from "@/lib/exercise-grouping";
import { sortExercisesByRecency } from "@/lib/exercise-sorting";
import { getTodayRange } from "@/lib/date-utils";
import type { Exercise, Set } from "@/types/domain";

export function Dashboard() {
  const { isLoaded: isClerkLoaded, userId } = useAuth();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const [lastLoggedSetId, setLastLoggedSetId] = useState<Id<"sets"> | null>(
    null
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const formRef = useRef<QuickLogFormHandle>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const { unit } = useWeightUnit();

  // Fetch data from Convex
  const allSets = useQuery(api.sets.listSets, {});
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
      allSets !== undefined &&
      exercises !== undefined &&
      !isHydrated
    ) {
      // Use RAF to ensure React completes render cycle with stable data
      requestAnimationFrame(() => {
        setIsHydrated(true);
      });
    }
  }, [authReady, allSets, exercises, isHydrated]);

  // Delete set mutation
  const deleteSet = useMutation(api.sets.deleteSet);

  // Filter sets to today only (midnight to midnight in user's timezone)
  const todaysSets = useMemo(() => {
    if (!allSets) return undefined;
    const { start, end } = getTodayRange();
    return allSets.filter(
      (set: any) => set.performedAt >= start && set.performedAt <= end
    );
  }, [allSets]);

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
  const exercisesByRecency = useMemo(
    () => sortExercisesByRecency(exercises, allSets),
    [exercises, allSets]
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
  const handleRepeatSet = (set: Set) => {
    formRef.current?.repeatSet(set);
  };

  // Handle set logged - show undo toast and scroll to history
  const handleSetLogged = (setId: Id<"sets">) => {
    setLastLoggedSetId(setId);
    setUndoToastVisible(true);

    // 100ms delay ensures React finishes rendering the newly logged set
    // in the history section before scrolling to it
    setTimeout(() => {
      historyRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 100);
  };

  // Handle undo - delete the last logged set
  const handleUndo = async () => {
    if (lastLoggedSetId) {
      try {
        await deleteSet({ id: lastLoggedSetId });
        setUndoToastVisible(false);
        setLastLoggedSetId(null);
      } catch (error) {
        handleMutationError(error, "Undo Set");
      }
    }
  };

  // Handle dismiss toast
  const handleDismissToast = () => {
    setUndoToastVisible(false);
    setLastLoggedSetId(null);
  };

  // Loading state - show skeleton until data is stable
  if (!isHydrated) {
    return (
      <PageLayout title="Dashboard">
        {/* Stats skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </CardContent>
        </Card>

        {/* Form skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </CardContent>
        </Card>

        {/* History skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className={LAYOUT.section.spacing}>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Type guard - by this point, isHydrated is true, so both queries must be defined
  // This satisfies TypeScript's type narrowing
  if (allSets === undefined || exercises === undefined) {
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
          <>
            {/* Quick Log Form - PRIME POSITION */}
            <QuickLogForm
              ref={formRef}
              exercises={activeExercisesByRecency}
              onSetLogged={handleSetLogged}
            />

            {/* Today's Set History - Aggregated stats with drill-down */}
            <GroupedSetHistory
              ref={historyRef}
              exerciseGroups={exerciseGroups}
              exerciseMap={exerciseMap}
              onRepeat={handleRepeatSet}
              onDelete={handleDeleteSet}
              isLoading={!isHydrated}
            />
          </>
        )}
      </PageLayout>

      {/* Undo Toast - Fixed position overlay, not affected by spacing */}
      <UndoToast
        visible={undoToastVisible}
        onUndo={handleUndo}
        onDismiss={handleDismissToast}
      />
    </>
  );
}
