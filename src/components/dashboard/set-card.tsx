"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
import { formatTimeAgo, formatDuration } from "@/lib/date-utils";
import { Exercise, Set } from "@/types/domain";
import {
  numberDisplayClasses,
  labelDisplayClasses,
} from "@/lib/typography-utils";
import { brutalistMotion } from "@/lib/brutalist-motion";

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
    <motion.div
      variants={brutalistMotion.mechanicalSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`
        p-4 bg-background border-3 border-concrete-black dark:border-concrete-white
        hover:shadow-lift dark:hover:shadow-lift-dark
        transition-shadow
        ${isDeleting && "opacity-50 pointer-events-none"}
      `}
      data-testid={`set-card-${set._id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4
            className="font-display text-xl uppercase tracking-wide text-foreground"
            data-testid={`set-exercise-name-${set._id}`}
          >
            {exercise?.name || "Unknown exercise"}
          </h4>
          <div className="mt-1 flex items-center gap-3">
            {set.duration !== undefined ? (
              <span className={numberDisplayClasses.default}>
                {formatDuration(set.duration)}
              </span>
            ) : (
              <span className={numberDisplayClasses.default}>
                {set.reps} reps
              </span>
            )}
            {set.weight && (
              <>
                <span className="text-concrete-gray">•</span>
                <span className={numberDisplayClasses.large}>{set.weight}</span>
                <span className={`${labelDisplayClasses.default} ml-1`}>
                  {displayUnit}
                </span>
              </>
            )}
          </div>
          <p className={`mt-1 ${labelDisplayClasses.small}`}>
            {formatTimeAgo(set.performedAt, "compact")}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onRepeat}
            className="p-2 text-danger-red hover:bg-danger-red/10 border-2 border-transparent hover:border-danger-red transition-colors focus:outline-none focus:ring-2 focus:ring-danger-red"
            aria-label="Repeat this set"
            title="Repeat this set"
            type="button"
            data-testid={`set-repeat-btn-${set._id}`}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 text-danger-red hover:bg-danger-red/10 border-2 border-transparent hover:border-danger-red transition-colors focus:outline-none focus:ring-2 focus:ring-danger-red"
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
    </motion.div>
  );
}
