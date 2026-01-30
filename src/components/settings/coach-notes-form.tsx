"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { SettingsList } from "@/components/ui/settings-list";
import { SettingsListItem } from "@/components/ui/settings-list-item";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { handleMutationError } from "@/lib/error-handler";

const MAX_TRAINING_SPLIT_LENGTH = 280;
const MAX_COACH_NOTES_LENGTH = 500;

interface CoachNotesFormProps {
  user?: Doc<"users"> | null;
}

export function CoachNotesForm({ user }: CoachNotesFormProps) {
  const updatePreferences = useMutation(api.users.updatePreferences);
  const [trainingSplit, setTrainingSplit] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const preferences = user?.preferences;
    setTrainingSplit(preferences?.trainingSplit ?? "");
    setCoachNotes(preferences?.coachNotes ?? "");
  }, [user?.preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({
        trainingSplit: trainingSplit.trim(),
        coachNotes: coachNotes.trim(),
      });
      toast.success("Coaching notes updated");
    } catch (error) {
      handleMutationError(error, "Update Coaching Notes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsList>
      <SettingsListItem
        title="Training Split"
        subtitle={
          <div className="mt-2 space-y-2">
            <Textarea
              value={trainingSplit}
              onChange={(event) => setTrainingSplit(event.target.value)}
              maxLength={MAX_TRAINING_SPLIT_LENGTH}
              placeholder="e.g. Push/Pull/Legs, 4 days per week"
              rows={4}
            />
            <div className="flex justify-end text-xs text-muted-foreground">
              {trainingSplit.length}/{MAX_TRAINING_SPLIT_LENGTH}
            </div>
          </div>
        }
        className="items-start"
      />
      <SettingsListItem
        title="Coach Notes"
        subtitle={
          <div className="mt-2 space-y-2">
            <Textarea
              value={coachNotes}
              onChange={(event) => setCoachNotes(event.target.value)}
              maxLength={MAX_COACH_NOTES_LENGTH}
              placeholder="Share constraints, injuries, or coaching focus"
              rows={5}
            />
            <div className="flex justify-end text-xs text-muted-foreground">
              {coachNotes.length}/{MAX_COACH_NOTES_LENGTH}
            </div>
          </div>
        }
        className="items-start"
      />
      <SettingsListItem
        title="Save Coaching Notes"
        subtitle="Update your training split and coaching notes"
        actions={
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              "Save"
            )}
          </Button>
        }
      />
    </SettingsList>
  );
}
