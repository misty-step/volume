"use client";

import { useAction } from "convex/react";
import { useEffect, useRef, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
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
      onCreated(exerciseId);
    } catch (error) {
      handleMutationError(error, "Create Exercise");
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="p-3 bg-muted border rounded-md">
      <p className="text-sm font-medium mb-2">Create New Exercise</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      ref={inputRef}
                      type="text"
                      onKeyDown={handleKeyDown}
                      placeholder="Exercise name..."
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "..." : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
