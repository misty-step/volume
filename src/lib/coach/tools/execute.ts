import type {
  CoachToolContext,
  CoachToolExecutionOptions,
  ToolResult,
} from "./types";
import { getCoachToolDefinition } from "./registry";

export async function executeCoachTool(
  toolName: string,
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
): Promise<ToolResult> {
  const definition = getCoachToolDefinition(toolName);
  if (!definition) {
    return {
      summary: `Unsupported tool: ${toolName}`,
      blocks: [
        {
          type: "status",
          tone: "error",
          title: "Unsupported action",
          description: `${toolName} is not available.`,
        },
        {
          type: "suggestions",
          prompts: ["show today's summary", "what should I work on today?"],
        },
      ],
      outputForModel: {
        status: "error",
        error: "unsupported_tool",
        tool: toolName,
      },
    };
  }

  return definition.run(rawArgs, ctx, options);
}
