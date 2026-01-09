"use client";

import { useAction } from "convex/react";
import { useEffect, useRef, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { handleMutationError } from "@/lib/error-handler";

// Validation schema
const exerciseNameSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type ExerciseNameFormValues = z.infer<typeof exerciseNameSchema>;

interface InlineExerciseCreatorProps {
  onCreated: (exerciseId: Id<"exercises">) => void;
  onCancel: () => void;
}

export function InlineExerciseCreator({
  onCreated,
  onCancel,
}: InlineExerciseCreatorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const createExercise = useAction(api.exercises.createExercise);

  const form = useForm<ExerciseNameFormValues>({
    resolver: zodResolver(exerciseNameSchema),
    defaultValues: {
      name: "",
    },
  });

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Form submission handler
  const onSubmit = async (values: ExerciseNameFormValues) => {
    try {
      const exerciseId = await createExercise({ name: values.name.trim() });
      toast.success("Exercise created");
      form.reset({ name: "" });
      onCreated(exerciseId);
    } catch (error) {
      handleMutationError(error, "Create Exercise");
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="border-3 border-concrete-black dark:border-concrete-white bg-muted/80 p-4">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        Create New Exercise
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Exercise *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    ref={inputRef}
                    type="text"
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Planks"
                    className="h-[46px]"
                    disabled={form.formState.isSubmitting}
                    data-testid="create-exercise-name-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="h-[46px]"
            disabled={form.formState.isSubmitting}
            data-testid="create-exercise-submit-btn"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Create"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-[46px]"
            disabled={form.formState.isSubmitting}
            data-testid="create-exercise-cancel-btn"
          >
            Cancel
          </Button>
        </form>
      </Form>
    </div>
  );
}
