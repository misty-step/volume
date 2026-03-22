import type { CoachToolContext, ToolResult } from "./types";

export async function runWorkspaceTool(
  _ctx: CoachToolContext
): Promise<ToolResult> {
  const workflows = [
    {
      id: "today_summary",
      title: "Today summary",
      subtitle: "Live totals and top exercises",
      prompt: "show today's summary",
    },
    {
      id: "analytics_overview",
      title: "Analytics overview",
      subtitle: "Streaks, PRs, overload, focus suggestions",
      prompt: "show analytics overview",
    },
    {
      id: "history_overview",
      title: "History",
      subtitle: "Recent sets and delete operations",
      prompt: "show history overview",
    },
    {
      id: "exercise_library",
      title: "Exercise library",
      subtitle: "Rename, archive, restore, muscle groups",
      prompt: "show exercise library",
    },
    {
      id: "settings_overview",
      title: "Settings and billing",
      subtitle: "Goals, coach notes, subscription state",
      prompt: "show settings overview",
    },
  ];
  const workflowItems = workflows.map(({ title, subtitle, prompt }) => ({
    title,
    subtitle,
    prompt,
  }));

  return {
    summary: "Rendered workspace actions.",
    blocks: [
      {
        type: "entity_list",
        title: "Core workflows",
        items: workflowItems,
      },
    ],
    outputForModel: {
      status: "ok",
      surface: "workspace",
      title: "Core workflows",
      workflows,
    },
  };
}
