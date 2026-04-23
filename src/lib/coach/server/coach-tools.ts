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

async function runCoachToolDefinition({
  definition,
  rawArgs,
  ctx,
  options,
}: {
  definition: CoachToolDefinition;
  rawArgs: unknown;
  ctx: CoachToolContext;
  options: CreateCoachToolsOptions;
}): Promise<ToolExecutionRecord> {
  let result: ToolResult;
  try {
    result = await definition.run(rawArgs, ctx);
  } catch (e) {
    result = toolErrorResult(
      e instanceof Error ? e.message : "Unexpected error"
    );
  }

  const record = toExecutionRecord({
    toolName: definition.name,
    input: rawArgs,
    result,
  });
  options.onToolResult?.(record);
  return record;
}

export async function runCoachToolByName(
  toolName: string,
  rawArgs: unknown,
  ctx: CoachToolContext,
  options: CreateCoachToolsOptions = {}
): Promise<ToolExecutionRecord | null> {
  const definition =
    coachToolDefinitions.find((candidate) => candidate.name === toolName) ??
    null;
  if (!definition) return null;

  return runCoachToolDefinition({ definition, rawArgs, ctx, options });
}

export function createCoachTools(
  ctx: CoachToolContext,
  options: CreateCoachToolsOptions = {}
) {
  async function runTool(
    definition: CoachToolDefinition,
    rawArgs: unknown
  ): Promise<ToolOutput> {
    const record = await runCoachToolDefinition({
      definition,
      rawArgs,
      ctx,
      options,
    });
    return { ...record.outputForModel };
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
