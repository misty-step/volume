import { useState, useCallback } from "react";
import { toast } from "sonner";

/**
 * Configuration for an undoable action.
 * @template TData - The shape of captured state for restoration
 * @template TItem - The item being acted upon
 */
export interface UndoableActionConfig<TData, TItem> {
  /** Mutation to execute (delete, archive, etc.) */
  action: (item: TItem) => Promise<void>;

  /** Extract data needed for restoration */
  captureState: (item: TItem) => TData;

  /** Mutation to restore the item */
  restore: (data: TData) => void | Promise<void>;

  /** Toast message on success */
  successMessage: string;

  /** Undo window in ms (default: 5000) */
  undoDuration?: number;

  /** Optional error handler for action failures */
  onActionError?: (error: unknown) => void;

  /** Optional error handler for restore failures */
  onRestoreError?: (error: unknown) => void;
}

export interface UndoableActionResult<TItem> {
  /** Execute the action with undo support. Returns true on success, false on failure. */
  execute: (item: TItem) => Promise<boolean>;

  /** Whether an action is currently in progress */
  isPending: boolean;
}

/**
 * Hook for executing destructive actions with undo support.
 *
 * Pattern:
 * 1. Captures state before executing action
 * 2. Executes the destructive action
 * 3. Shows toast with undo button
 * 4. Restores state if user clicks undo within window
 *
 * @example
 * ```tsx
 * const { execute, isPending } = useUndoableAction({
 *   action: (set) => deleteSet({ id: set._id }),
 *   captureState: (set) => ({
 *     exerciseId: set.exerciseId,
 *     reps: set.reps,
 *     weight: set.weight,
 *     performedAt: set.performedAt,
 *   }),
 *   restore: (data) => logSet(data),
 *   successMessage: "Set deleted",
 *   undoDuration: 5000,
 * });
 *
 * // In handler:
 * await execute(setToDelete);
 * ```
 */
export function useUndoableAction<TData, TItem>(
  config: UndoableActionConfig<TData, TItem>
): UndoableActionResult<TItem> {
  const {
    action,
    captureState,
    restore,
    successMessage,
    undoDuration = 5000,
    onActionError,
    onRestoreError,
  } = config;

  const [isPending, setIsPending] = useState(false);

  const execute = useCallback(
    async (item: TItem): Promise<boolean> => {
      setIsPending(true);
      try {
        // Capture state BEFORE action executes
        const capturedData = captureState(item);

        await action(item);

        toast.success(successMessage, {
          duration: undoDuration,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await restore(capturedData);
              } catch (error) {
                onRestoreError?.(error);
              }
            },
          },
        });
        return true;
      } catch (error) {
        onActionError?.(error);
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [
      action,
      captureState,
      restore,
      successMessage,
      undoDuration,
      onActionError,
      onRestoreError,
    ]
  );

  return { execute, isPending };
}
