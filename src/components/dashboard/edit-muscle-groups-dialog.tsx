"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { type Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { handleMutationError } from "@/lib/error-handler";
import { MUSCLE_GROUPS } from "../../../convex/lib/muscleGroups";

interface EditMuscleGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseId: Id<"exercises">;
  exerciseName: string;
  currentMuscleGroups: string[];
}

export function EditMuscleGroupsDialog({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
  currentMuscleGroups,
}: EditMuscleGroupsDialogProps) {
  const [selectedGroups, setSelectedGroups] =
    useState<string[]>(currentMuscleGroups);
  const [isSaving, setIsSaving] = useState(false);
  const updateMuscleGroups = useMutation(api.exercises.updateMuscleGroups);

  // Reset selection when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedGroups(currentMuscleGroups);
    }
    onOpenChange(newOpen);
  };

  const toggleGroup = (group: string) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const handleSave = async () => {
    if (selectedGroups.length === 0) {
      toast.error("Please select at least one muscle group");
      return;
    }

    setIsSaving(true);
    try {
      await updateMuscleGroups({
        id: exerciseId,
        muscleGroups: selectedGroups,
      });
      toast.success("Muscle groups updated");
      onOpenChange(false);
    } catch (error) {
      handleMutationError(error, "Update Muscle Groups");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Muscle Groups</DialogTitle>
          <DialogDescription>
            Select which muscle groups are trained by {exerciseName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {MUSCLE_GROUPS.map((group) => (
            <div key={group} className="flex items-center space-x-2">
              <Checkbox
                id={group}
                checked={selectedGroups.includes(group)}
                onCheckedChange={() => toggleGroup(group)}
              />
              <Label
                htmlFor={group}
                className="text-sm font-normal cursor-pointer"
              >
                {group}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <div className="text-xs text-muted-foreground flex-1">
            {selectedGroups.length === 0
              ? "Select at least one muscle group"
              : `${selectedGroups.length} selected`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
