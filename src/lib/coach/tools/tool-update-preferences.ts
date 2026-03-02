import { GOAL_LABELS } from "@/lib/goals";
import { api } from "@/../convex/_generated/api";
import { UpdatePreferencesArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

export async function runUpdatePreferencesTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = UpdatePreferencesArgsSchema.parse(rawArgs);

  const hasInput =
    args.goals !== undefined ||
    args.custom_goal !== undefined ||
    args.training_split !== undefined ||
    args.coach_notes !== undefined;

  if (!hasInput) {
    return {
      summary: "No preference fields provided.",
      blocks: [
        {
          type: "status",
          tone: "info",
          title: "Nothing to update",
          description: "Provide one or more preference fields to update.",
        },
      ],
      outputForModel: { status: "ok", updated: false },
    };
  }

  await ctx.convex.mutation(api.users.updatePreferences, {
    goals: args.goals,
    customGoal: args.custom_goal,
    trainingSplit: args.training_split,
    coachNotes: args.coach_notes,
  });

  const goalsLabel =
    args.goals && args.goals.length > 0
      ? args.goals.map((goal) => GOAL_LABELS[goal]).join(", ")
      : undefined;

  return {
    summary: "Updated preferences.",
    blocks: [
      {
        type: "detail_panel",
        title: "Preferences updated",
        fields: [
          {
            label: "Goals",
            value: goalsLabel ?? "No change",
            emphasis: goalsLabel !== undefined,
          },
          {
            label: "Custom goal",
            value: args.custom_goal ?? "No change",
            emphasis: args.custom_goal !== undefined,
          },
          {
            label: "Training split",
            value: args.training_split ?? "No change",
            emphasis: args.training_split !== undefined,
          },
          {
            label: "Coach notes",
            value: args.coach_notes ?? "No change",
            emphasis: args.coach_notes !== undefined,
          },
        ],
      },
    ],
    outputForModel: {
      status: "ok",
      updated: true,
      goals: args.goals ?? null,
      custom_goal: args.custom_goal ?? null,
      training_split: args.training_split ?? null,
      coach_notes: args.coach_notes ?? null,
    },
  };
}
