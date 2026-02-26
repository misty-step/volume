import type { CoachToolContext, ToolResult } from "./types";

export async function runWorkspaceTool(
  _ctx: CoachToolContext
): Promise<ToolResult> {
  return {
    summary: "Rendered streamlined workspace actions.",
    blocks: [
      {
        type: "status",
        tone: "info",
        title: "Agent workspace online",
        description:
          "Use chat to log sets, review progress, and manage account.",
      },
      {
        type: "entity_list",
        title: "Core workflows",
        items: [
          {
            title: "Today summary",
            subtitle: "Live totals and top exercises",
            prompt: "show today's summary",
          },
          {
            title: "Analytics overview",
            subtitle: "Streaks, PRs, overload, focus suggestions",
            prompt: "show analytics overview",
          },
          {
            title: "History",
            subtitle: "Recent sets and delete operations",
            prompt: "show history overview",
          },
          {
            title: "Exercise library",
            subtitle: "Rename, archive, restore, muscle groups",
            prompt: "show exercise library",
          },
          {
            title: "Settings and billing",
            subtitle: "Goals, coach notes, subscription state",
            prompt: "show settings overview",
          },
        ],
      },
    ],
    outputForModel: {
      status: "ok",
      workflows: [
        "today_summary",
        "analytics_overview",
        "history_overview",
        "exercise_library",
        "settings_overview",
      ],
    },
  };
}
