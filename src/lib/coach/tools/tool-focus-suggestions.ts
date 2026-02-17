import { api } from "@/../convex/_generated/api";
import { uniquePrompts } from "./helpers";
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
        {
          type: "suggestions",
          prompts: [
            "show today's summary",
            "show trend for pushups",
            "show trend for squats",
          ],
        },
      ],
      outputForModel: {
        status: "ok",
        suggestions: [],
      },
    };
  }

  const rows = suggestions.map((item) => ({
    label: item.title,
    value: item.priority.toUpperCase(),
    meta: item.reason,
  }));

  const prompts: string[] = ["show today's summary"];
  for (const item of suggestions) {
    if (item.title.toLowerCase().startsWith("train ")) {
      const exercise = item.title.slice("train ".length).trim();
      prompts.push(`show trend for ${exercise.toLowerCase()}`);
      prompts.push(`10 ${exercise.toLowerCase()}`);
    }
    if (item.suggestedExercises && item.suggestedExercises.length > 0) {
      prompts.push(
        `show trend for ${item.suggestedExercises[0]!.toLowerCase()}`
      );
    }
  }

  return {
    summary: "Prepared focus suggestions.",
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Today's focus plan",
        description: "Based on your logged history and balance checks.",
      },
      {
        type: "table",
        title: "What to work on today",
        rows,
      },
      {
        type: "suggestions",
        prompts: uniquePrompts(prompts),
      },
    ],
    outputForModel: {
      status: "ok",
      suggestions: suggestions.map((item) => ({
        title: item.title,
        priority: item.priority,
        reason: item.reason,
      })),
    },
  };
}
