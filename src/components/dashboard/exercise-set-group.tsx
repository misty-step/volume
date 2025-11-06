"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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
    } catch (error) {
      handleMutationError(error, "Delete Set");
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        {/* Header - Always visible, clickable to expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="space-y-2">
            {/* Exercise Name Row */}
            <div className="flex items-start gap-3">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <span className="font-semibold text-base line-clamp-2">
                {exercise.name}
              </span>
            </div>

            {/* Stats Row */}
            <div className="pl-7 text-sm text-muted-foreground">
              {sets.length} set{sets.length === 1 ? "" : "s"} •{" "}
              {totalVolume > 0
                ? `${formatNumber(Math.round(totalVolume))} ${preferredUnit}`
                : `${totalReps} reps`}
            </div>
          </div>
        </button>

        {/* Expanded content - Set list */}
        {isExpanded && (
          <div className="divide-y">
            {sets.map((set) => {
              const isDeleting = deletingId === set._id;
              return (
                <div
                  key={set._id}
                  className="px-4 py-3 space-y-2 hover:bg-muted/30 transition-colors"
                >
                  {/* Row 1: Reps/Duration + Weight (Primary Data) - Grid for alignment */}
                  <div className="grid grid-cols-[auto_1fr] gap-x-6 text-base">
                    {/* Reps or Duration column */}
                    <div className="flex items-center gap-2">
                      {set.duration !== undefined ? (
                        <>
                          <span className="font-bold tabular-nums">
                            {formatDuration(set.duration)}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            time
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold tabular-nums">
                            {set.reps}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            reps
                          </span>
                        </>
                      )}
                    </div>

                    {/* Weight column */}
                    <div className="flex items-center gap-2">
                      {set.weight ? (
                        <>
                          <span className="font-bold tabular-nums">
                            {set.weight}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {set.unit || preferredUnit}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Time + Actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {formatTimestamp(set.performedAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      {showRepeat && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRepeat(set)}
                          disabled={isDeleting}
                          aria-label="Repeat set"
                          className="h-8 w-8 p-0"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(set)}
                        disabled={isDeleting}
                        aria-label="Delete set"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
