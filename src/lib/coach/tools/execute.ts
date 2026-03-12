import { ZodError } from "zod";
import type {
  CoachToolContext,
  CoachToolExecutionOptions,
  ToolResult,
} from "./types";
import { getCoachToolDefinition } from "./registry";

function buildToolErrorResult({
  toolName,
  errorCode,
  title,
  message,
}: {
  toolName: string;
  errorCode: string;
  title: string;
  message: string;
}): ToolResult {
  return {
    summary: `${title}: ${toolName}`,
    blocks: [
      {
        type: "status",
        tone: "error",
        title,
        description: message,
      },
      {
        type: "suggestions",
        prompts: ["show today's summary", "what should I work on today?"],
      },
    ],
    outputForModel: {
      status: "error",
      error: errorCode,
      tool: toolName,
      message,
    },
  };
}

export async function executeCoachTool(
  toolName: string,
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
): Promise<ToolResult> {
  const definition = getCoachToolDefinition(toolName);
  if (!definition) {
    return buildToolErrorResult({
      toolName,
      errorCode: "unsupported_tool",
      title: "Unsupported action",
      message: `${toolName} is not available.`,
    });
  }

  try {
    const parsedArgs = definition.inputSchema.parse(rawArgs);
    return await definition.run(parsedArgs, ctx, options);
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Invalid tool arguments.";
      return buildToolErrorResult({
        toolName,
        errorCode: "invalid_tool_args",
        title: "Invalid tool arguments",
        message,
      });
    }

    return buildToolErrorResult({
      toolName,
      errorCode: "tool_failed",
      title: "Tool failed",
      message: error instanceof Error ? error.message : "Unexpected error",
    });
  }
}
