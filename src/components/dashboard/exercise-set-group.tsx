"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { BrutalistButton } from "@/components/brutalist";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { handleMutationError } from "@/lib/error-handler";
import { formatNumber } from "@/lib/number-utils";
import { formatTimestamp } from "@/lib/date-utils";
import { Exercise, Set, WeightUnit } from "@/types/domain";

interface ExerciseSetGroupProps {
  exercise: Exercise;
  sets: Set[];
  totalVolume: number;
  totalReps: number;
  preferredUnit: WeightUnit;
  onRepeat: (set: Set) => void;
  onDelete: (setId: Id<"sets">) => void;
  showRepeat?: boolean;
}

export function ExerciseSetGroup({
  exercise,
  sets,
  totalVolume,
  totalReps,
  preferredUnit,
  onRepeat,
  onDelete,
  showRepeat = true,
}: ExerciseSetGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"sets"> | null>(null);
  const [setToDelete, setSetToDelete] = useState<Set | null>(null);

  // Format duration in seconds to mm:ss
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDeleteClick = (set: Set) => {
    setSetToDelete(set);
  };

  const confirmDelete = async () => {
    if (!setToDelete) return;

    setDeletingId(setToDelete._id);
    try {
      await onDelete(setToDelete._id);
      toast.success("Set deleted");
      setSetToDelete(null);
      setDeletingId(null);
    } catch (error) {
      handleMutationError(error, "Delete Set");
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="border-3 border-concrete-black dark:border-concrete-white overflow-hidden">
        {/* Header - Always visible, clickable to expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left px-4 py-4 bg-background hover:bg-concrete-gray/10 transition-colors"
          data-testid={`exercise-group-${exercise._id}`}
        >
          <div className="space-y-2">
            {/* Exercise Name Row */}
            <div className="flex items-start gap-3">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-danger-red mt-0.5 shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-danger-red mt-0.5 shrink-0" />
              )}
              <span className="font-display text-lg uppercase tracking-wide line-clamp-2">
                {exercise.name}
              </span>
            </div>

            {/* Stats Row */}
            <div className="pl-8 font-mono text-xs uppercase tracking-wider text-concrete-gray">
              {sets.length} SET{sets.length === 1 ? "" : "S"} •{" "}
              {totalVolume > 0
                ? `${formatNumber(Math.round(totalVolume))} ${preferredUnit.toUpperCase()}`
                : `${totalReps} REPS`}
            </div>
          </div>
        </button>

        {/* Expanded content - Set list */}
        {isExpanded && (
          <div className="divide-y-3 divide-concrete-gray">
            {sets.map((set) => {
              const isDeleting = deletingId === set._id;
              return (
                <div
                  key={set._id}
                  className="px-4 py-4 space-y-3 hover:bg-concrete-gray/5 transition-colors"
                  data-testid={`exercise-set-item-${set._id}`}
                >
                  {/* Row 1: Reps/Duration + Weight (Primary Data) - Grid for alignment */}
                  <div className="grid grid-cols-[auto_1fr] gap-x-8 font-mono text-lg">
                    {/* Reps or Duration column */}
                    <div className="flex items-center gap-2">
                      {set.duration !== undefined ? (
                        <>
                          <span className="font-bold tabular-nums text-safety-orange">
                            {formatDuration(set.duration)}
                          </span>
                          <span className="text-concrete-gray text-xs uppercase tracking-wider">
                            TIME
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold tabular-nums text-safety-orange">
                            {set.reps}
                          </span>
                          <span className="text-concrete-gray text-xs uppercase tracking-wider">
                            REPS
                          </span>
                        </>
                      )}
                    </div>

                    {/* Weight column */}
                    <div className="flex items-center gap-2">
                      {set.weight != null ? (
                        <>
                          <span className="font-bold tabular-nums">
                            {set.weight}
                          </span>
                          <span className="text-concrete-gray text-xs uppercase tracking-wider">
                            {(set.unit || preferredUnit).toUpperCase()}
                          </span>
                        </>
                      ) : (
                        <span className="text-concrete-gray text-sm">—</span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Time + Actions */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-concrete-gray">
                      {formatTimestamp(set.performedAt).toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      {showRepeat && (
                        <BrutalistButton
                          variant="ghost"
                          size="sm"
                          onClick={() => onRepeat(set)}
                          disabled={isDeleting}
                          aria-label="Repeat set"
                          className="h-8 w-8 p-0"
                          data-testid={`repeat-set-btn-${set._id}`}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </BrutalistButton>
                      )}
                      <BrutalistButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(set)}
                        disabled={isDeleting}
                        aria-label="Delete set"
                        className="h-8 w-8 p-0 text-danger-red hover:text-danger-red"
                        data-testid={`delete-set-btn-${set._id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </BrutalistButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={setToDelete !== null}
        onOpenChange={(open) => !open && setSetToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete set?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="confirm-delete-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
