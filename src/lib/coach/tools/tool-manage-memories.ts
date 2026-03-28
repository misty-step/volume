import { api } from "@/../convex/_generated/api";
import { ManageMemoriesArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

export async function runManageMemoriesTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = ManageMemoriesArgsSchema.parse(rawArgs);

  if (args.action === "remember") {
    if (!args.category) {
      throw new Error("Remember requests require a category");
    }

    const result = await ctx.convex.mutation(
      api.userMemories.rememberExplicitMemory,
      {
        category: args.category,
        content: args.content,
      }
    );

    return {
      summary: result.created ? "Saved memory." : "Memory already saved.",
      blocks: [
        {
          type: "status",
          tone: "success",
          title: result.created ? "I'll remember that" : "Already remembered",
          description: args.content,
        },
      ],
      outputForModel: {
        status: "ok",
        action: "remember",
        created: result.created,
        category: args.category,
        content: args.content,
      },
    };
  }

  const result = await ctx.convex.mutation(
    api.userMemories.forgetMemoryByContent,
    {
      content: args.content,
    }
  );

  return {
    summary:
      result.deletedCount > 0
        ? "Forgot matching memory."
        : "No matching memory found.",
    blocks: [
      {
        type: "status",
        tone: result.deletedCount > 0 ? "success" : "info",
        title:
          result.deletedCount > 0
            ? "I won't use that going forward"
            : "Nothing matched",
        description:
          result.deletedCount > 0
            ? args.content
            : "I couldn't find a stored memory that matched that request.",
      },
    ],
    outputForModel: {
      status: "ok",
      action: "forget",
      deleted_count: result.deletedCount,
      content: args.content,
    },
  };
}
