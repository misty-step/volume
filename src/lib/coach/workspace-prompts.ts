export type ForcedCoachToolName =
  | "query_workouts"
  | "get_insights"
  | "get_settings_overview"
  | "get_exercise_library"
  | "manage_exercise";

export type ForcedCoachRouteIntent = {
  toolName: ForcedCoachToolName;
  actionHint?: "today_summary" | "history_overview" | "analytics_overview";
};

export type CoachWorkspaceWorkflow = {
  id:
    | "today_summary"
    | "analytics_overview"
    | "history_overview"
    | "exercise_library"
    | "settings_overview";
  title: string;
  subtitle: string;
  prompt: string;
  forcedRoute: ForcedCoachRouteIntent;
};

export const COACH_WORKSPACE_WORKFLOWS = [
  {
    id: "today_summary",
    title: "Today summary",
    subtitle: "Live totals and top exercises",
    prompt: "show today's summary",
    forcedRoute: {
      toolName: "query_workouts",
      actionHint: "today_summary",
    },
  },
  {
    id: "analytics_overview",
    title: "Analytics overview",
    subtitle: "Streaks, PRs, overload, focus suggestions",
    prompt: "show analytics overview",
    forcedRoute: {
      toolName: "get_insights",
      actionHint: "analytics_overview",
    },
  },
  {
    id: "history_overview",
    title: "History",
    subtitle: "Recent sets and delete operations",
    prompt: "show history overview",
    forcedRoute: {
      toolName: "query_workouts",
      actionHint: "history_overview",
    },
  },
  {
    id: "exercise_library",
    title: "Exercise library",
    subtitle: "Rename, archive, restore, muscle groups",
    prompt: "show exercise library",
    forcedRoute: {
      toolName: "get_exercise_library",
    },
  },
  {
    id: "settings_overview",
    title: "Settings and billing",
    subtitle: "Goals, coach notes, subscription state",
    prompt: "show settings overview",
    forcedRoute: {
      toolName: "get_settings_overview",
    },
  },
] as const satisfies readonly CoachWorkspaceWorkflow[];

const FORCED_ROUTE_BY_PROMPT = new Map(
  COACH_WORKSPACE_WORKFLOWS.map((workflow) => [
    normalizeCoachWorkspacePrompt(workflow.prompt),
    workflow.forcedRoute,
  ])
);

const MANAGE_EXERCISE_COMMANDS = ["archive", "delete", "restore"] as const;
const MANAGE_EXERCISE_PATTERN = new RegExp(
  `^(${MANAGE_EXERCISE_COMMANDS.join("|")}) exercise\\s+.+`,
  "i"
);

export function normalizeCoachWorkspacePrompt(value: string): string {
  return value.trim().toLowerCase();
}

export function findForcedCoachRouteIntent(
  prompt: string
): ForcedCoachRouteIntent | null {
  const normalized = normalizeCoachWorkspacePrompt(prompt);
  if (!normalized) return null;

  const workflowRoute = FORCED_ROUTE_BY_PROMPT.get(normalized);
  if (workflowRoute) {
    return workflowRoute;
  }

  if (MANAGE_EXERCISE_PATTERN.test(prompt)) {
    return { toolName: "manage_exercise" };
  }

  return null;
}
