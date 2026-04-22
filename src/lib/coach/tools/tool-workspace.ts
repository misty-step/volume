import type { CoachToolContext, ToolResult } from "./types";
import { COACH_WORKSPACE_WORKFLOWS } from "@/lib/coach/workspace-prompts";

export async function runWorkspaceTool(
  _ctx: CoachToolContext
): Promise<ToolResult> {
  const workflows = COACH_WORKSPACE_WORKFLOWS.map(
    ({ id, title, subtitle, prompt }) => ({
      id,
      title,
      subtitle,
      prompt,
    })
  );
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
