import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { handleMutationError } from "@/lib/error-handler";
import { checkForPR } from "@/lib/pr-detection";
import { showPRCelebration } from "@/components/dashboard/pr-celebration";
import { Exercise } from "@/types/domain";

// Validation schema for quick log form
// Supports both rep-based and duration-based exercises
const quickLogSchema = z
  .object({
    exerciseId: z.string().min(1, "Exercise is required"),
    reps: z.number().min(1, "Reps must be at least 1").optional(),
    weight: z.number().optional(),
    unit: z.enum(["lbs", "kg"]).optional(),
    duration: z
      .number()
      .min(1, "Duration must be at least 1 second")
      .max(86400, "Duration must be 24 hours or less")
      .optional(),
  })
  .refine((data) => data.reps !== undefined || data.duration !== undefined, {
    message: "Must provide either reps or duration",
    path: ["reps"],
  })
  .refine((data) => !(data.reps !== undefined && data.duration !== undefined), {
    message: "Cannot provide both reps and duration",
    path: ["duration"],
  });

export type QuickLogFormValues = z.infer<typeof quickLogSchema>;

export interface UseQuickLogFormOptions {
  unit: "lbs" | "kg";
  exercises: Exercise[];
  onSetLogged?: (setId: Id<"sets">) => void;
  onUndo?: (setId: Id<"sets">) => void;
  onSuccess?: () => void;
}

export function useQuickLogForm({
  unit,
  exercises,
  onSetLogged,
  onUndo,
  onSuccess,
}: UseQuickLogFormOptions) {
  const logSet = useMutation(api.sets.logSet);

  const form = useForm<QuickLogFormValues>({
    resolver: zodResolver(quickLogSchema),
    defaultValues: {
      exerciseId: "",
      reps: undefined,
      weight: undefined,
      unit: unit,
      duration: undefined,
    },
  });

  // Watch selected exercise for PR detection
  const selectedExerciseId = form.watch("exerciseId");

  // Fetch previous sets for selected exercise (for PR detection)
  const previousSets = useQuery(
    api.sets.listSets,
    selectedExerciseId
      ? { exerciseId: selectedExerciseId as Id<"exercises"> }
      : "skip"
  );

  const onSubmit = async (values: QuickLogFormValues) => {
    try {
      const setId = await logSet({
        exerciseId: values.exerciseId as Id<"exercises">,
        reps: values.reps,
        weight: values.weight,
        unit: values.weight ? values.unit : undefined,
        duration: values.duration,
      });

      // Check for PR before showing success toast (only for rep-based exercises)
      let isPR = false;
      if (values.reps !== undefined) {
        const currentSet = {
          _id: setId, // Use the newly created set ID
          exerciseId: values.exerciseId as Id<"exercises">,
          reps: values.reps,
          weight: values.weight,
          performedAt: Date.now(),
          userId: "", // Not used for PR detection
        };

        // Exclude the just-logged set from PR comparison
        const setsForComparison =
          previousSets?.filter((set) => set._id !== setId) ?? [];
        const prResult = checkForPR(currentSet, setsForComparison);

        if (prResult) {
          isPR = true;
          // Find exercise name for celebration message
          const exercise = exercises.find((e) => e._id === values.exerciseId);
          if (exercise) {
            showPRCelebration(exercise.name, prResult, unit);
          }
        }
      }

      // Show success toast with undo action (skip if PR celebration shown)
      if (!isPR) {
        toast.success("Set logged!", {
          duration: 10000,
          action: onUndo
            ? {
                label: "Undo",
                onClick: () => onUndo(setId),
              }
            : undefined,
        });
      }

      // Keep exercise selected, clear reps/weight/duration
      form.reset({
        exerciseId: values.exerciseId, // CRITICAL: Preserve selection
        reps: undefined,
        weight: undefined,
        unit: values.unit,
        duration: undefined,
      });

      onSetLogged?.(setId);
      onSuccess?.();
    } catch (error) {
      handleMutationError(error, "Log Set");
    }
  };

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
  };
}
