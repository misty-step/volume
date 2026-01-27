import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import type { DeletedSetData } from "@/components/dashboard/exercise-set-group";
import type { QuickLogFormHandle } from "@/components/dashboard/quick-log-form";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import {
  groupSetsByExercise,
  type ExerciseGroup,
} from "@/lib/exercise-grouping";
import { sortExercisesByRecency } from "@/lib/exercise-sorting";
import { getTodayRange } from "@/lib/date-utils";
import { handleMutationError } from "@/lib/error-handler";
import type { Exercise, Set as WorkoutSet, WeightUnit } from "@/types/domain";

export interface UseDashboardOptions {
  isMobile: boolean;
}

export interface UseDashboardReturn {
  authReady: boolean;
  isHydrated: boolean;
  formOpen: boolean;
  setFormOpen: Dispatch<SetStateAction<boolean>>;
  unit: WeightUnit;
  todaysSets: WorkoutSet[] | undefined;
  exercises: Exercise[] | undefined;
  exerciseGroups: ExerciseGroup[];
  exerciseMap: Map<Id<"exercises">, Exercise>;
  exercisesByRecency: Exercise[];
  activeExercisesByRecency: Exercise[];
  formRef: RefObject<QuickLogFormHandle | null>;
  historyRef: RefObject<HTMLDivElement | null>;
  handleDeleteSet: (setId: Id<"sets">) => Promise<void>;
  handleRepeatSet: (set: WorkoutSet) => void;
  handleSetLogged: () => void;
  handlePRFlash: () => void;
  handleHapticFeedback: () => void;
  handleUndoDelete: (setData: DeletedSetData) => Promise<void>;
  handleFirstExerciseCreated: (exerciseId: Id<"exercises">) => void;
}

export function useDashboard({
  isMobile,
}: UseDashboardOptions): UseDashboardReturn {
  const { isLoaded: isClerkLoaded, userId } = useAuth();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const formRef = useRef<QuickLogFormHandle>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const { unit } = useWeightUnit();
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

  // Set mutations
  const deleteSet = useMutation(api.sets.deleteSet);
  const logSet = useMutation(api.sets.logSet);

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
    () => exercisesByRecency.filter((ex) => ex.deletedAt === undefined),
    [exercisesByRecency]
  );

  // Delete a set (used for both direct delete and undo-create)
  async function handleDeleteSet(setId: Id<"sets">): Promise<void> {
    try {
      await deleteSet({ id: setId });
    } catch (error) {
      handleMutationError(error, "Delete Set");
    }
  }

  function handleRepeatSet(set: WorkoutSet): void {
    formRef.current?.repeatSet(set);
  }

  // Scroll to history after logging; on mobile, also close the modal
  function handleSetLogged(): void {
    if (isMobile) setFormOpen(false);

    // Brief delay ensures React renders the new set before scrolling
    setTimeout(() => {
      historyRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  function handlePRFlash(): void {
    if (typeof document === "undefined") return;
    document.body.classList.add("animate-pr-flash");
    setTimeout(() => document.body.classList.remove("animate-pr-flash"), 300);
  }

  function handleHapticFeedback(): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }
  }

  // Recreate a deleted set (undo delete action)
  async function handleUndoDelete(setData: DeletedSetData): Promise<void> {
    try {
      await logSet({
        exerciseId: setData.exerciseId,
        reps: setData.reps,
        weight: setData.weight,
        unit: setData.unit,
        duration: setData.duration,
        performedAt: setData.performedAt,
      });
    } catch (error) {
      handleMutationError(error, "Restore Set");
    }
  }

  // Auto-select newly created exercise in form
  function handleFirstExerciseCreated(exerciseId: Id<"exercises">): void {
    // Brief delay lets React render the new exercise in dropdown
    setTimeout(() => {
      formRef.current?.repeatSet({
        _id: "" as Id<"sets">,
        exerciseId,
        reps: 0,
        performedAt: Date.now(),
      });
    }, 100);
  }

  return {
    authReady,
    isHydrated,
    formOpen,
    setFormOpen,
    unit,
    todaysSets,
    exercises,
    exerciseGroups,
    exerciseMap,
    exercisesByRecency,
    activeExercisesByRecency,
    formRef,
    historyRef,
    handleDeleteSet,
    handleRepeatSet,
    handleSetLogged,
    handlePRFlash,
    handleHapticFeedback,
    handleUndoDelete,
    handleFirstExerciseCreated,
  };
}
