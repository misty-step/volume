import type { ZodTypeAny } from "zod";
import {
  EmptyArgsSchema,
  GetInsightsArgsSchema,
  LogSetsArgsSchema,
  ManageExerciseArgsSchema,
  ManageMemoriesArgsSchema,
  ModifySetArgsSchema,
  QueryExerciseArgsSchema,
  QueryWorkoutsArgsSchema,
  ReportHistoryArgsSchema,
  UpdateSettingsArgsSchema,
} from "@/lib/domain/actions/schemas";

export type DomainActionScope =
  | "sets:read"
  | "sets:write"
  | "exercises:read"
  | "exercises:write"
  | "profile:read"
  | "profile:write"
  | "insights:read"
  | "memories:write";

export type DomainActionAuditCategory =
  | "sets"
  | "exercises"
  | "profile"
  | "insights"
  | "memories";

export type DomainActionIdempotency = "none" | "client_optional";

export type DomainActionExposure = "public" | "coach";

export type DomainActionDefinition<Name extends string = string> = {
  name: Name;
  description: string;
  inputSchema: ZodTypeAny;
  scopes: readonly DomainActionScope[];
  auditCategory: DomainActionAuditCategory;
  idempotency: DomainActionIdempotency;
  exposure: DomainActionExposure;
};

function defineDomainAction<const Name extends string>(
  definition: DomainActionDefinition<Name>
) {
  return definition;
}

export const domainActionDefinitions = [
  defineDomainAction({
    name: "log_sets",
    description:
      "Log one or more workout sets. Use action=log_set with a single set object for one set, or action=bulk_log with a sets array when the user reports multiple sets or exercises.",
    inputSchema: LogSetsArgsSchema,
    scopes: ["sets:write"],
    auditCategory: "sets",
    idempotency: "client_optional",
    exposure: "public",
  }),
  defineDomainAction({
    name: "modify_set",
    description:
      "Modify an existing set. Use action=edit to change a set or action=delete to remove a set by set_id or latest exercise set.",
    inputSchema: ModifySetArgsSchema,
    scopes: ["sets:write"],
    auditCategory: "sets",
    idempotency: "client_optional",
    exposure: "public",
  }),
  defineDomainAction({
    name: "query_workouts",
    description:
      "Read workout-level data. Use action=today_summary for today's totals, workout_session for one day, date_range for a span, or history_overview for recent sets.",
    inputSchema: QueryWorkoutsArgsSchema,
    scopes: ["sets:read"],
    auditCategory: "sets",
    idempotency: "none",
    exposure: "public",
  }),
  defineDomainAction({
    name: "query_exercise",
    description:
      "Read one exercise's data. Use action=snapshot for summary stats, trend for 14-day progression, or history for recent logged sets.",
    inputSchema: QueryExerciseArgsSchema,
    scopes: ["exercises:read"],
    auditCategory: "exercises",
    idempotency: "none",
    exposure: "public",
  }),
  defineDomainAction({
    name: "manage_exercise",
    description:
      "Manage exercise library entries. Use action=rename, delete, restore, merge, or update_muscle_groups.",
    inputSchema: ManageExerciseArgsSchema,
    scopes: ["exercises:write"],
    auditCategory: "exercises",
    idempotency: "client_optional",
    exposure: "public",
  }),
  defineDomainAction({
    name: "get_settings_overview",
    description:
      "Get profile preferences, subscription status, and billing actions.",
    inputSchema: EmptyArgsSchema,
    scopes: ["profile:read"],
    auditCategory: "profile",
    idempotency: "none",
    exposure: "public",
  }),
  defineDomainAction({
    name: "update_settings",
    description:
      "Update coach settings. Use action=weight_unit, sound, or preferences.",
    inputSchema: UpdateSettingsArgsSchema,
    scopes: ["profile:write"],
    auditCategory: "profile",
    idempotency: "client_optional",
    exposure: "coach",
  }),
  defineDomainAction({
    name: "get_insights",
    description:
      "Read coach insights. Use action=analytics_overview for streaks and PRs, or focus_suggestions for today's training priorities.",
    inputSchema: GetInsightsArgsSchema,
    scopes: ["insights:read"],
    auditCategory: "insights",
    idempotency: "none",
    exposure: "coach",
  }),
  defineDomainAction({
    name: "manage_memories",
    description:
      "Remember or forget durable user context such as injuries, goals, and preferences.",
    inputSchema: ManageMemoriesArgsSchema,
    scopes: ["memories:write"],
    auditCategory: "memories",
    idempotency: "client_optional",
    exposure: "coach",
  }),
  defineDomainAction({
    name: "get_exercise_library",
    description:
      "List exercise library including archived entries and available actions.",
    inputSchema: EmptyArgsSchema,
    scopes: ["exercises:read"],
    auditCategory: "exercises",
    idempotency: "none",
    exposure: "coach",
  }),
  defineDomainAction({
    name: "get_report_history",
    description: "List recent AI report history entries.",
    inputSchema: ReportHistoryArgsSchema,
    scopes: ["insights:read"],
    auditCategory: "insights",
    idempotency: "none",
    exposure: "coach",
  }),
] satisfies readonly DomainActionDefinition[];

export type DomainActionName = (typeof domainActionDefinitions)[number]["name"];

const domainActionDefinitionMap = new Map<
  string,
  (typeof domainActionDefinitions)[number]
>(domainActionDefinitions.map((definition) => [definition.name, definition]));

export function getDomainActionDefinition(name: string) {
  return domainActionDefinitionMap.get(name);
}

export function getDomainActionNames() {
  return domainActionDefinitions.map((definition) => definition.name);
}

export function getPublicDomainActionDefinitions() {
  return domainActionDefinitions.filter(
    (definition) => definition.exposure === "public"
  );
}
