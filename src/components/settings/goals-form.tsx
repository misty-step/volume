"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { GOAL_LABELS, GOAL_TYPES, type GoalType } from "@/lib/goals";
import { SettingsList } from "@/components/ui/settings-list";
import { SettingsListItem } from "@/components/ui/settings-list-item";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { handleMutationError } from "@/lib/error-handler";

const MAX_CUSTOM_GOAL_LENGTH = 280;

interface GoalsFormProps {
  user?: Doc<"users"> | null;
}

export function GoalsForm({ user }: GoalsFormProps) {
  const updatePreferences = useMutation(api.users.updatePreferences);
  const [goals, setGoals] = useState<GoalType[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const preferences = user?.preferences;
    setGoals(preferences?.goals ?? []);
    setCustomGoal(preferences?.customGoal ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when user changes
  }, [user?._id]);

  const handleToggleGoal = (goal: GoalType, checked: boolean) => {
    setGoals((prev) => {
      if (checked) {
        return prev.includes(goal) ? prev : [...prev, goal];
      }
      return prev.filter((item) => item !== goal);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({
        goals,
        customGoal: customGoal.trim(),
      });
      toast.success("Goals updated");
    } catch (error) {
      handleMutationError(error, "Update Goals");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsList>
      <SettingsListItem
        title="Training Goals"
        subtitle={
          <div className="mt-2 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {GOAL_TYPES.map((goal) => (
                <label
                  key={goal}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
                >
                  <Checkbox
                    checked={goals.includes(goal)}
                    onCheckedChange={(checked) =>
                      handleToggleGoal(goal, checked === true)
                    }
                  />
                  <span>{GOAL_LABELS[goal]}</span>
                </label>
              ))}
            </div>
          </div>
        }
        className="items-start"
      />
      <SettingsListItem
        title="Custom Goal"
        subtitle={
          <div className="mt-2 space-y-2">
            <Textarea
              value={customGoal}
              onChange={(event) => setCustomGoal(event.target.value)}
              maxLength={MAX_CUSTOM_GOAL_LENGTH}
              placeholder="e.g. Run a 5k under 25 minutes"
              aria-label="Custom goal"
              rows={4}
            />
            <div className="flex justify-end text-xs text-muted-foreground">
              {customGoal.length}/{MAX_CUSTOM_GOAL_LENGTH}
            </div>
          </div>
        }
        className="items-start"
      />
      <SettingsListItem
        title="Save Goals"
        subtitle="Update your goals and custom target"
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
