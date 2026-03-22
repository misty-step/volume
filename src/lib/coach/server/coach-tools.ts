import { tool } from "ai";
import {
  coachToolDefinitions,
  type CoachToolDefinition,
} from "@/lib/coach/tools/registry";
import type { CoachToolContext, ToolResult } from "@/lib/coach/tools/types";
import type { ToolExecutionRecord } from "@/lib/coach/presentation/types";
import { sanitizeError } from "@/lib/coach/sanitize-error";

export type ToolOutput = Record<string, unknown>;
type CreateCoachToolsOptions = {
  onToolResult?: (record: ToolExecutionRecord) => void;
};

/**
 * Wrap a tool result into the output the model sees.
 *
 * The planner sees only semantic tool data. Presentation is composed later.
 */
function wrap(result: ToolResult): ToolOutput {
  return { ...result.outputForModel };
}

function toExecutionRecord({
  toolName,
  input,
  result,
}: {
  toolName: string;
  input: unknown;
  result: ToolResult;
}): ToolExecutionRecord {
  return {
    toolName,
    input,
    summary: result.summary,
    outputForModel: result.outputForModel,
    legacyBlocks: result.blocks,
  };
}

function toolErrorResult(message: string): ToolResult {
  const safe = sanitizeError(message);
  return {
    summary: safe,
    blocks: [
      {
        type: "status",
        tone: "error",
        title: "Tool failed",
        description: safe,
      },
    ],
    outputForModel: {
      status: "error",
      error: safe,
    },
  };
}

export function createCoachTools(
  ctx: CoachToolContext,
  options: CreateCoachToolsOptions = {}
) {
  async function runTool(
    definition: CoachToolDefinition,
    rawArgs: unknown
  ): Promise<ToolOutput> {
    let result: ToolResult;
    try {
      result = await definition.run(rawArgs, ctx);
    } catch (e) {
      result = toolErrorResult(
        e instanceof Error ? e.message : "Unexpected error"
      );
    }
    options.onToolResult?.(
      toExecutionRecord({
        toolName: definition.name,
        input: rawArgs,
        result,
      })
    );
    return wrap(result);
  }

  return Object.fromEntries(
    coachToolDefinitions.map((definition) => [
      definition.name,
      tool({
        description: definition.description,
        inputSchema: definition.inputSchema as any,
        execute: (args: any) => runTool(definition, args),
      }),
    ])
  );
}
