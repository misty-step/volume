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
  handleUndo: (setId: Id<"sets">) => Promise<void>;
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

  const handlePRFlash = () => {
    if (typeof document === "undefined") return;
    const PR_FLASH_DURATION_MS = 300;
    document.body.classList.add("animate-pr-flash");
    setTimeout(
      () => document.body.classList.remove("animate-pr-flash"),
      PR_FLASH_DURATION_MS
    );
  };

  const handleHapticFeedback = () => {
    const HAPTIC_FEEDBACK_DURATION_MS = 50;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(HAPTIC_FEEDBACK_DURATION_MS);
    }
  };

  // Handle undo - delete the set (called from toast action when undoing a create)
  const handleUndo = async (setId: Id<"sets">) => {
    try {
      await deleteSet({ id: setId });
    } catch (error) {
      handleMutationError(error, "Undo Set");
    }
  };

  // Handle undo delete - recreate the set (called from toast action when undoing a delete)
  const handleUndoDelete = async (setData: DeletedSetData) => {
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
  };

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
    handleUndo,
    handleUndoDelete,
    handleFirstExerciseCreated,
  };
}
