"use client";

import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  KeyboardEvent,
} from "react";
import { Id } from "../../../convex/_generated/dataModel";
import {
  BrutalistCard,
  BrutalistButton,
  BrutalistInput,
} from "@/components/brutalist";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { InlineExerciseCreator } from "./inline-exercise-creator";
import { DurationInput } from "./duration-input";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { Exercise, Set } from "@/types/domain";
import { useQuickLogForm, QuickLogFormValues } from "@/hooks/useQuickLogForm";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/date-utils";
import { ExerciseSelectorDialog } from "./exercise-selector-dialog";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { GhostSetDisplay } from "./ghost-set-display";

interface QuickLogFormProps {
  exercises: Exercise[];
  onSetLogged?: (setId: Id<"sets">) => void;
  onUndo?: (setId: Id<"sets">) => void;
}

export interface QuickLogFormHandle {
  repeatSet: (set: Set) => void;
}

/**
 * Delay to ensure DOM updates complete before focusing input.
 * 100ms allows Radix Dialog/Popover close animation to finish
 * and React to update the DOM with the selected exercise.
 * Increased from 50ms for better reliability on mobile devices.
 */
const FOCUS_DELAY_MS = 100;

const QuickLogFormComponent = forwardRef<QuickLogFormHandle, QuickLogFormProps>(
  function QuickLogForm({ exercises, onSetLogged, onUndo }, ref) {
    const [showInlineCreator, setShowInlineCreator] = useState(false);
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [isDurationMode, setIsDurationMode] = useState(false);
    const repsInputRef = useRef<HTMLInputElement>(null);
    const weightInputRef = useRef<HTMLInputElement>(null);
    const durationInputRef = useRef<HTMLInputElement>(null);

    const { unit } = useWeightUnit();

    const { form, onSubmit } = useQuickLogForm({
      unit,
      exercises,
      onSetLogged,
      onUndo,
      onSuccess: () => {
        // Focus appropriate input based on mode
        focusElement(isDurationMode ? durationInputRef : repsInputRef);
      },
    });

    // Watch for changes in form values to clear opposing fields
    useEffect(() => {
      const subscription = form.watch((value, { name }) => {
        if (name === "reps" && value.reps !== undefined) {
          form.setValue("duration", undefined);
          setIsDurationMode(false);
        } else if (name === "duration" && value.duration !== undefined) {
          form.setValue("reps", undefined);
          setIsDurationMode(true);
        }
      });
      return () => subscription.unsubscribe();
    }, [form]);

    /*
     * Autofocus Flow:
     * 1. User selects exercise → auto-focus reps input (useEffect below)
     * 2. User enters reps, presses Enter → focus weight input (handleRepsKeyDown)
     * 3. User enters weight, presses Enter → submit form (handleWeightKeyDown)
     * 4. After successful submit → focus reps input for next set (handleSubmit)
     * Note: Exercise stays selected after submit for quick multi-set logging
     */

    /**
     * Autofocus pattern using Radix Select's onOpenChange event
     *
     * Why this approach?
     * - Event-driven: Focus triggered when dropdown animation completes
     * - Reliable: onOpenChange(false) fires after Radix closes dropdown
     * - Simple: Single RAF for browser render cycle, not timing hacks
     *
     * Focus flow:
     * 1. User selects exercise → dropdown closes → onOpenChange(false) fires
     * 2. Single RAF waits for React render cycle (DOM updates)
     * 3. Focus reps input → user types reps → Enter → focus weight → Enter → submit
     *
     * Why single RAF vs double RAF?
     * - onOpenChange guarantees dropdown animation complete
     * - Only need to wait for React render, not Radix animation
     * - Simpler, more maintainable pattern
     *
     * Reference: Radix UI Select guarantees onOpenChange fires after animation
     * https://www.radix-ui.com/primitives/docs/components/select#onOpenChange
     */
    const focusElement = (ref: React.RefObject<HTMLInputElement | null>) => {
      requestAnimationFrame(() => {
        // Defensive checks before focusing
        if (ref.current && document.contains(ref.current)) {
          try {
            ref.current.focus();
          } catch (e) {
            // Fail silently if focus is not possible
            console.warn("Focus failed:", e);
          }
        }
      });
    };

    const isMobile = useMobileViewport();

    // Expose repeatSet method to parent via ref
    useImperativeHandle(ref, () => ({
      repeatSet: (set: Set) => {
        form.setValue("exerciseId", set.exerciseId);
        if (set.duration !== undefined) {
          form.setValue("duration", set.duration);
          form.setValue("reps", undefined);
          setIsDurationMode(true);
          focusElement(durationInputRef);
        } else {
          form.setValue("reps", set.reps);
          form.setValue("duration", undefined);
          setIsDurationMode(false);
          focusElement(repsInputRef);
        }
        form.setValue("weight", set.weight ?? undefined);
      },
    }));

    // Handle Enter key in reps input - focus weight or submit
    const handleRepsKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (weightInputRef.current) {
          weightInputRef.current.focus();
        }
      }
    };

    // Handle Enter key in weight input - submit form
    const handleWeightKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
    };

    // Shared form content
    const formContent = (
      <div className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Mode Toggle */}
            <div className="mb-4 flex items-center gap-3">
              <BrutalistButton
                type="button"
                variant={!isDurationMode ? "danger" : "outline"}
                size="default"
                onClick={() => {
                  setIsDurationMode(false);
                  form.setValue("duration", undefined);
                  focusElement(repsInputRef);
                }}
              >
                Reps
              </BrutalistButton>
              <BrutalistButton
                type="button"
                variant={isDurationMode ? "danger" : "outline"}
                size="default"
                onClick={() => {
                  setIsDurationMode(true);
                  form.setValue("reps", undefined);
                  focusElement(durationInputRef);
                }}
              >
                Duration
              </BrutalistButton>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                {/* Exercise Selector - Combobox with search */}
                <FormField
                  control={form.control}
                  name="exerciseId"
                  render={({ field }) => (
                    <FormItem
                      className={
                        isDurationMode ? "md:col-span-5" : "md:col-span-6"
                      }
                    >
                      <FormLabel className="font-mono text-sm uppercase tracking-wider">
                        Exercise *
                      </FormLabel>
                      <FormControl>
                        <ExerciseSelectorDialog
                          open={comboboxOpen}
                          onOpenChange={(open) => {
                            setComboboxOpen(open);
                            if (!open && field.value) {
                              focusElement(
                                isDurationMode ? durationInputRef : repsInputRef
                              );
                            }
                          }}
                          exercises={exercises}
                          selectedId={field.value || null}
                          onSelect={(id) => {
                            field.onChange(id);
                            setComboboxOpen(false);
                            setTimeout(
                              () =>
                                focusElement(
                                  isDurationMode
                                    ? durationInputRef
                                    : repsInputRef
                                ),
                              FOCUS_DELAY_MS
                            );
                          }}
                          onCreateNew={() => {
                            setShowInlineCreator(true);
                            setComboboxOpen(false);
                            field.onChange("");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Ghost Set Display - Show last set inline + suggestions */}
              {form.watch("exerciseId") && (
                <div className="mt-3">
                  <GhostSetDisplay
                    exerciseId={form.watch("exerciseId")}
                    onSuggestionAvailable={(suggestion) => {
                      // Auto-populate form with suggestion
                      if (suggestion.reps !== undefined) {
                        form.setValue("reps", suggestion.reps);
                      }
                      if (suggestion.weight !== undefined) {
                        form.setValue("weight", suggestion.weight);
                      }
                      if (suggestion.duration !== undefined) {
                        form.setValue("duration", suggestion.duration);
                      }
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                {/* Reps or Duration input based on mode */}
                {!isDurationMode ? (
                  <FormField
                    control={form.control}
                    name="reps"
                    render={({ field }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel className="font-mono text-sm uppercase tracking-wider">
                          Reps *
                        </FormLabel>
                        <FormControl>
                          <BrutalistInput
                            {...field}
                            ref={repsInputRef}
                            type="number"
                            inputMode="numeric"
                            min="1"
                            onKeyDown={handleRepsKeyDown}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined
                              )
                            }
                            value={field.value ?? ""}
                            placeholder="0"
                            className="w-full"
                            disabled={form.formState.isSubmitting}
                            data-testid="quick-log-reps-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem className="md:col-span-4">
                        <FormLabel className="font-mono text-sm uppercase tracking-wider">
                          Duration *
                        </FormLabel>
                        <FormControl>
                          <DurationInput
                            ref={durationInputRef}
                            value={field.value}
                            onChange={field.onChange}
                            disabled={form.formState.isSubmitting}
                            onEnter={() => {
                              if (weightInputRef.current) {
                                weightInputRef.current.focus();
                              } else {
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                            data-testid="quick-log-duration-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Weight Input */}
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel className="font-mono text-sm uppercase tracking-wider">
                        Weight ({unit})
                      </FormLabel>
                      <FormControl>
                        <BrutalistInput
                          {...field}
                          ref={weightInputRef}
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          onKeyDown={handleWeightKeyDown}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          value={field.value ?? ""}
                          placeholder="0"
                          className="w-full"
                          disabled={form.formState.isSubmitting}
                          data-testid="quick-log-weight-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit button - parent handles sticky positioning on mobile */}
            <div className="pt-6 md:flex md:justify-end">
              <BrutalistButton
                type="submit"
                variant="danger"
                size="lg"
                className="w-full md:w-64"
                disabled={form.formState.isSubmitting}
                data-testid="quick-log-submit-btn"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Logging...
                  </>
                ) : (
                  "Log Set"
                )}
              </BrutalistButton>
            </div>
          </form>
        </Form>

        {/* Inline Exercise Creator (rendered outside the log form to avoid nested forms) */}
        {showInlineCreator && (
          <InlineExerciseCreator
            onCreated={(exerciseId) => {
              form.setValue("exerciseId", exerciseId);
              setShowInlineCreator(false);
              focusElement(isDurationMode ? durationInputRef : repsInputRef);
            }}
            onCancel={() => {
              setShowInlineCreator(false);
              focusElement(isDurationMode ? durationInputRef : repsInputRef);
            }}
          />
        )}
      </div>
    );

    // Mobile: no card wrapper, no header - parent handles positioning
    if (isMobile) {
      return formContent;
    }

    // Desktop: card wrapper with header
    return (
      <BrutalistCard className="p-6">
        <h2 className="font-display text-2xl uppercase tracking-wide mb-6">
          Log Set
        </h2>
        {formContent}
      </BrutalistCard>
    );
  }
);

export const QuickLogForm = QuickLogFormComponent;
