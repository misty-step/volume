import { SetSoundArgsSchema } from "./schemas";
import type { ToolResult } from "./types";

export function runSetSoundTool(rawArgs: unknown): ToolResult {
  const args = SetSoundArgsSchema.parse(rawArgs);
  return {
    summary: `Set tactile sounds ${args.enabled ? "on" : "off"}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: `Tactile sounds ${args.enabled ? "enabled" : "disabled"}`,
        description: "Applied locally.",
      },
      {
        type: "client_action",
        action: "set_sound",
        payload: { enabled: args.enabled },
      },
    ],
    outputForModel: {
      status: "ok",
      enabled: args.enabled,
    },
  };
}
