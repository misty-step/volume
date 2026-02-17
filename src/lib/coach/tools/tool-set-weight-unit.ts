import { SetWeightUnitArgsSchema } from "./schemas";
import type { ToolResult } from "./types";

export function runSetWeightUnitTool(rawArgs: unknown): ToolResult {
  const args = SetWeightUnitArgsSchema.parse(rawArgs);
  return {
    summary: `Set weight unit to ${args.unit}.`,
    blocks: [
      {
        type: "status",
        tone: "success",
        title: `Weight unit set to ${args.unit.toUpperCase()}`,
        description: "Applied locally for future logging.",
      },
      {
        type: "client_action",
        action: "set_weight_unit",
        payload: { unit: args.unit },
      },
      {
        type: "suggestions",
        prompts: ["10 pushups", "show today's summary"],
      },
    ],
    outputForModel: {
      status: "ok",
      unit: args.unit,
    },
  };
}
