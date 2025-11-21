"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
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
import { formatTimeAgo } from "@/lib/date-utils";
import { Exercise, Set } from "@/types/domain";

interface SetCardProps {
  set: Set;
  exercise: Exercise | undefined;
  onRepeat: () => void;
  onDelete: () => void;
}

export function SetCard({ set, exercise, onRepeat, onDelete }: SetCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { unit: preferredUnit } = useWeightUnit();
  // Use the unit stored with the set, fallback to user preference for legacy sets
  const displayUnit = set.unit || preferredUnit;

  // Format duration in seconds to mm:ss
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success("Set deleted");
      setShowDeleteDialog(false);
    } catch (error) {
      handleMutationError(error, "Delete Set");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`
        p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        rounded-lg hover:shadow-md transition-all
        ${isDeleting ? "opacity-50 pointer-events-none" : ""}
      `}
      data-testid={`set-card-${set._id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4
            className="font-semibold text-lg text-gray-900 dark:text-gray-100"
            data-testid={`set-exercise-name-${set._id}`}
          >
            {exercise?.name || "Unknown exercise"}
          </h4>
          <div className="mt-1 flex items-center gap-3 text-gray-600 dark:text-gray-300">
            {set.duration !== undefined ? (
              <span className="font-medium">
                {formatDuration(set.duration)}
              </span>
            ) : (
              <span className="font-medium">{set.reps} reps</span>
            )}
            {set.weight && (
              <>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>
                  {set.weight} {displayUnit}
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatTimeAgo(set.performedAt, "compact")}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onRepeat}
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Repeat this set"
            title="Repeat this set"
            type="button"
            data-testid={`set-repeat-btn-${set._id}`}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Delete this set"
            title="Delete this set"
            type="button"
            data-testid={`set-delete-btn-${set._id}`}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Set</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this set? This cannot be undone.
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
    </div>
  );
}
