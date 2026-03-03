import { api } from "@/../convex/_generated/api";
import type { CoachToolContext, FocusSuggestion, ToolResult } from "./types";

export async function runFocusSuggestionsTool(
  ctx: CoachToolContext
): Promise<ToolResult> {
  const suggestions = (await ctx.convex.query(
    api.analyticsFocus.getFocusSuggestions,
    {}
  )) as FocusSuggestion[];

  if (suggestions.length === 0) {
    return {
      summary: "No focus gaps found yet.",
      blocks: [
        {
          type: "status",
          tone: "info",
          title: "No major training gaps detected",
          description:
            "Keep logging consistently and ask again after more sessions.",
        },
      ],
      outputForModel: {
        status: "ok",
        suggestion_count: 0,
      },
    };
  }

  const rows = suggestions.map((item) => ({
    label: item.title,
    value: item.priority.toUpperCase(),
    meta: item.reason,
  }));

  return {
    summary: "Prepared focus suggestions.",
    blocks: [
      {
        type: "table",
        title: "What to work on today",
        rows,
      },
    ],
    outputForModel: {
      status: "ok",
      suggestion_count: suggestions.length,
    },
  };
}
