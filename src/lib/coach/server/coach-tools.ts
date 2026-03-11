import { tool } from "ai";
import type { CoachBlock } from "@/lib/coach/schema";
import {
  coachToolDefinitions,
  type CoachToolDefinition,
} from "@/lib/coach/tools/registry";
import type { CoachToolContext, ToolResult } from "@/lib/coach/tools/types";

export type ToolOutput = Record<string, unknown>;
type ToolBlocksHandler = (toolName: string, blocks: CoachBlock[]) => void;
type CreateCoachToolsOptions = { onBlocks?: ToolBlocksHandler };

function wrap(
  toolName: string,
  result: ToolResult,
  onBlocks?: ToolBlocksHandler
): ToolOutput {
  onBlocks?.(toolName, result.blocks);
  const blockSummary = result.blocks
    .filter((b) => b.type !== "suggestions")
    .map((b) => ({
      type: b.type,
      ...("title" in b && b.title ? { title: b.title } : {}),
    }));
  return {
    ...result.outputForModel,
    ...(blockSummary.length > 0 ? { _blocks: blockSummary } : {}),
  };
}

function toolError(
  toolName: string,
  message: string,
  onBlocks?: ToolBlocksHandler
): ToolOutput {
  onBlocks?.(toolName, [
    {
      type: "status",
      tone: "error",
      title: "Tool failed",
      description: message,
    } satisfies CoachBlock,
  ]);
  return { error: message };
}

export function createCoachTools(
  ctx: CoachToolContext,
  options: CreateCoachToolsOptions = {}
) {
  const { onBlocks } = options;

  async function runTool(
    definition: CoachToolDefinition,
    rawArgs: unknown
  ): Promise<ToolOutput> {
    try {
      return wrap(
        definition.name,
        await definition.run(rawArgs, ctx),
        onBlocks
      );
    } catch (e) {
      return toolError(
        definition.name,
        e instanceof Error ? e.message : "Unexpected error",
        onBlocks
      );
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
