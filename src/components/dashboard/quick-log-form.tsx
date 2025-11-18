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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { useLastSet } from "@/hooks/useLastSet";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickLogFormProps {
  exercises: Exercise[];
  onSetLogged?: (setId: Id<"sets">) => void;
}

export interface QuickLogFormHandle {
  repeatSet: (set: Set) => void;
}

/**
 * Delay to ensure DOM updates complete before focusing input.
 * 50ms allows Radix Popover close animation to finish and
 * React to update the DOM with the selected exercise.
 *
 * Note: Could use requestAnimationFrame instead, but fixed
 * delay is more predictable and less complex.
 */
const FOCUS_DELAY_MS = 50;

const QuickLogFormComponent = forwardRef<QuickLogFormHandle, QuickLogFormProps>(
  function QuickLogForm({ exercises, onSetLogged }, ref) {
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

    // Watch selected exercise for last set query
    const selectedExerciseId = form.watch("exerciseId");

    // Get last set and time formatter
    const { lastSet, formatTimeAgo } = useLastSet(selectedExerciseId);

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

    // Format duration in seconds to mm:ss
    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
      <BrutalistCard className="p-6">
        <h2 className="font-display text-2xl uppercase tracking-wide mb-6">
          Log Set
        </h2>
        <div className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Last Set Indicator */}
              {lastSet && (
                <div className="mb-4 p-4 border-3 border-concrete-gray dark:border-concrete-gray bg-background flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="font-mono text-sm uppercase tracking-wide">
                    <span className="text-safety-orange">LAST:</span>{" "}
                    {exercises.find((e) => e._id === selectedExerciseId)?.name}{" "}
                    •{" "}
                    {lastSet.duration !== undefined
                      ? `${formatDuration(lastSet.duration)}`
                      : `${lastSet.reps} REPS`}
                    {lastSet.weight &&
                      ` @ ${lastSet.weight} ${lastSet.unit || unit}`}{" "}
                    • {formatTimeAgo(lastSet.performedAt).toUpperCase()}
                  </p>
                  <BrutalistButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (lastSet.duration !== undefined) {
                        form.setValue("duration", lastSet.duration);
                        form.setValue("reps", undefined);
                        setIsDurationMode(true);
                        focusElement(durationInputRef);
                      } else {
                        form.setValue("reps", lastSet.reps);
                        form.setValue("duration", undefined);
                        setIsDurationMode(false);
                        focusElement(repsInputRef);
                      }
                      form.setValue("weight", lastSet.weight ?? undefined);
                    }}
                    className="sm:ml-2 shrink-0"
                  >
                    Use
                  </BrutalistButton>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="mb-4 flex items-center gap-3">
                <BrutalistButton
                  type="button"
                  variant={!isDurationMode ? "danger" : "outline"}
                  size="sm"
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
                  size="sm"
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
                    render={({ field }) => {
                      const selectedExercise = exercises.find(
                        (ex) => ex._id === field.value
                      );

                      return (
                        <FormItem
                          className={
                            isDurationMode ? "md:col-span-5" : "md:col-span-6"
                          }
                        >
                          <FormLabel className="font-mono text-xs uppercase tracking-wider">
                            Exercise *
                          </FormLabel>
                          <Popover
                            open={comboboxOpen}
                            onOpenChange={(open) => {
                              setComboboxOpen(open);
                              // When combobox closes and exercise is selected, focus appropriate input based on mode
                              if (!open && field.value) {
                                focusElement(
                                  isDurationMode
                                    ? durationInputRef
                                    : repsInputRef
                                );
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <BrutalistButton
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={comboboxOpen}
                                  className={cn(
                                    "w-full h-12 justify-between font-mono normal-case",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  disabled={form.formState.isSubmitting}
                                >
                                  {selectedExercise?.name || "SELECT..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </BrutalistButton>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="Type to search..." />
                                <CommandList>
                                  <CommandEmpty>
                                    No exercises found.
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {exercises.map((exercise) => (
                                      <CommandItem
                                        key={exercise._id}
                                        value={exercise.name}
                                        onSelect={() => {
                                          field.onChange(exercise._id);
                                          setComboboxOpen(false);
                                          // Focus appropriate input based on mode after popover closes
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
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === exercise._id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {exercise.name}
                                      </CommandItem>
                                    ))}
                                    <CommandItem
                                      value="CREATE_NEW"
                                      onSelect={() => {
                                        setShowInlineCreator(true);
                                        setComboboxOpen(false);
                                        field.onChange("");
                                      }}
                                      className="border-t"
                                    >
                                      + Create New
                                    </CommandItem>
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {/* Reps or Duration input based on mode */}
                  {!isDurationMode ? (
                    <FormField
                      control={form.control}
                      name="reps"
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel className="font-mono text-xs uppercase tracking-wider">
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
                          <FormLabel className="font-mono text-xs uppercase tracking-wider">
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
                        <FormLabel className="font-mono text-xs uppercase tracking-wider">
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Submit button anchored below entire form */}
              <div className="pt-6 md:flex md:justify-end">
                <BrutalistButton
                  type="submit"
                  variant="danger"
                  size="lg"
                  className="w-full md:w-64"
                  disabled={form.formState.isSubmitting}
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
      </BrutalistCard>
    );
  }
);

export const QuickLogForm = QuickLogFormComponent;
