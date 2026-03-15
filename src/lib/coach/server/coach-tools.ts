import { tool } from "ai";
import {
  coachToolDefinitions,
  type CoachToolDefinition,
} from "@/lib/coach/tools/registry";
import type { CoachToolContext, ToolResult } from "@/lib/coach/tools/types";

export type ToolOutput = Record<string, unknown>;

/**
 * Wrap a tool result into the output the model sees.
 *
 * Includes the full block specifications in `_uiBlocks` so the model can
 * convert them to json-render JSONL patches using the catalog vocabulary.
 */
function wrap(result: ToolResult): ToolOutput {
  return {
    ...result.outputForModel,
    ...(result.blocks.length > 0 ? { _uiBlocks: result.blocks } : {}),
  };
}

function toolError(message: string): ToolOutput {
  return {
    error: message,
    _uiBlocks: [
      {
        type: "status",
        tone: "error",
        title: "Tool failed",
        description: message,
      },
    ],
  };
}

export function createCoachTools(ctx: CoachToolContext) {
  async function runTool(
    definition: CoachToolDefinition,
    rawArgs: unknown
  ): Promise<ToolOutput> {
    try {
      return wrap(await definition.run(rawArgs, ctx));
    } catch (e) {
      return toolError(e instanceof Error ? e.message : "Unexpected error");
    }
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
