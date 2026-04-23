export type ForcedCoachToolName =
  | "log_sets"
  | "modify_set"
  | "query_workouts"
  | "get_insights"
  | "get_settings_overview"
  | "get_exercise_library"
  | "manage_exercise";

export type ForcedCoachRouteIntent = {
  toolName: ForcedCoachToolName;
  actionHint?: "today_summary" | "history_overview" | "analytics_overview";
};

export type ForcedCoachRouteMatch = {
  intent: ForcedCoachRouteIntent;
  deterministicArgs: Record<string, unknown> | null;
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

const MANAGE_EXERCISE_PATTERN = /^(archive|delete|restore)\s+exercise\s+(.+)$/i;
const SIMPLE_LOG_SET_PATTERN = /^log\s+(\d+)\s+reps?\s+of\s+(.+)$/i;
const SIMPLE_DELETE_SET_PATTERN = /^delete\s+set\s+(.+)$/i;
const SET_ID_PATTERN = /^[a-z0-9]{20,}$/i;

export function normalizeCoachWorkspacePrompt(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function compactPrompt(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isQuoted(value: string): boolean {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  );
}

function unquotePromptValue(value: string): string {
  const trimmed = value.trim();
  return isQuoted(trimmed) ? trimmed.slice(1, -1).trim() : trimmed;
}

function buildWorkflowArgs(
  intent: ForcedCoachRouteIntent
): Record<string, unknown> | null {
  if (
    intent.toolName === "query_workouts" &&
    (intent.actionHint === "today_summary" ||
      intent.actionHint === "history_overview")
  ) {
    return { action: intent.actionHint };
  }

  if (
    intent.toolName === "get_insights" &&
    intent.actionHint === "analytics_overview"
  ) {
    return { action: "analytics_overview" };
  }

  if (
    intent.toolName === "get_settings_overview" ||
    intent.toolName === "get_exercise_library"
  ) {
    return {};
  }

  return null;
}

function parseManageExercisePrompt(
  prompt: string
): ForcedCoachRouteMatch | null {
  const match = prompt.match(MANAGE_EXERCISE_PATTERN);
  if (!match) return null;

  const command = match[1]!.toLowerCase();
  const rawExerciseName = match[2]!.trim();
  if (
    (command === "archive" || command === "delete") &&
    !isQuoted(rawExerciseName)
  ) {
    return null;
  }

  const exerciseName = unquotePromptValue(rawExerciseName);
  if (!exerciseName) return null;

  return {
    intent: { toolName: "manage_exercise" },
    deterministicArgs: {
      action: command === "restore" ? "restore" : "delete",
      exercise_name: exerciseName,
    },
  };
}

function parseLogSetPrompt(prompt: string): ForcedCoachRouteMatch | null {
  const match = prompt.match(SIMPLE_LOG_SET_PATTERN);
  if (!match) return null;

  const reps = Number.parseInt(match[1]!, 10);
  const exerciseName = unquotePromptValue(match[2]!);
  if (!Number.isInteger(reps) || reps < 1 || !exerciseName) return null;

  return {
    intent: { toolName: "log_sets" },
    deterministicArgs: {
      action: "log_set",
      set: {
        exercise_name: exerciseName,
        reps,
      },
    },
  };
}

function parseDeleteSetPrompt(prompt: string): ForcedCoachRouteMatch | null {
  const match = prompt.match(SIMPLE_DELETE_SET_PATTERN);
  if (!match) return null;

  const rawTarget = match[1]!.trim();
  const target = unquotePromptValue(rawTarget);
  if (!target) return null;

  const deterministicArgs = isQuoted(rawTarget)
    ? {
        action: "delete",
        exercise_name: target,
      }
    : SET_ID_PATTERN.test(target)
      ? {
          action: "delete",
          set_id: target,
        }
      : null;

  if (!deterministicArgs) return null;

  return {
    intent: { toolName: "modify_set" },
    deterministicArgs,
  };
}

export function findForcedCoachRouteMatch(
  prompt: string
): ForcedCoachRouteMatch | null {
  const normalized = normalizeCoachWorkspacePrompt(prompt);
  if (!normalized) return null;

  const workflowRoute = FORCED_ROUTE_BY_PROMPT.get(normalized);
  if (workflowRoute) {
    return {
      intent: workflowRoute,
      deterministicArgs: buildWorkflowArgs(workflowRoute),
    };
  }

  const compacted = compactPrompt(prompt);
  const forcedCommand =
    parseManageExercisePrompt(compacted) ??
    parseLogSetPrompt(compacted) ??
    parseDeleteSetPrompt(compacted);
  if (forcedCommand) return forcedCommand;

  return null;
}

export function findForcedCoachRouteIntent(
  prompt: string
): ForcedCoachRouteIntent | null {
  return findForcedCoachRouteMatch(prompt)?.intent ?? null;
}
