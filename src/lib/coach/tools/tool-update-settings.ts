import { UpdateSettingsArgsSchema } from "./schemas";
import { runSetSoundTool } from "./tool-set-sound";
import { runSetWeightUnitTool } from "./tool-set-weight-unit";
import { runUpdatePreferencesTool } from "./tool-update-preferences";
import type { CoachToolContext, ToolResult } from "./types";

export async function runUpdateSettingsTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = UpdateSettingsArgsSchema.parse(rawArgs);

  switch (args.action) {
    case "weight_unit":
      return runSetWeightUnitTool({ unit: args.unit });
    case "sound":
      return runSetSoundTool({ enabled: args.enabled });
    case "preferences":
      return runUpdatePreferencesTool(
        {
          goals: args.goals,
          custom_goal: args.custom_goal,
          training_split: args.training_split,
          coach_notes: args.coach_notes,
        },
        ctx
      );
  }
}
