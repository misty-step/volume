// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getDomainActionDefinition,
  getPublicDomainActionDefinitions,
} from "@/lib/domain/actions/registry";
import { getCoachToolDefinition } from "@/lib/coach/tools/registry";

describe("domain action registry", () => {
  it("defines the initial public API action surface with scopes and audit categories", () => {
    const publicActions = getPublicDomainActionDefinitions();

    expect(publicActions.map((action) => action.name)).toEqual([
      "log_sets",
      "modify_set",
      "query_workouts",
      "query_exercise",
      "manage_exercise",
      "get_settings_overview",
    ]);

    expect(getDomainActionDefinition("log_sets")).toMatchObject({
      name: "log_sets",
      scopes: ["sets:write"],
      auditCategory: "sets",
      idempotency: "client_optional",
      exposure: "public",
    });

    expect(getDomainActionDefinition("query_exercise")).toMatchObject({
      name: "query_exercise",
      scopes: ["exercises:read"],
      auditCategory: "exercises",
      idempotency: "none",
      exposure: "public",
    });
  });

  it("uses domain schemas as the canonical contract for coach tool inputs", () => {
    const domainAction = getDomainActionDefinition("log_sets");
    const coachTool = getCoachToolDefinition("log_sets");

    expect(domainAction).toBeDefined();
    expect(coachTool).toBeDefined();
    expect(coachTool?.description).toBe(domainAction?.description);
    expect(coachTool?.inputSchema).toBe(domainAction?.inputSchema);
  });

  it("keeps validation behavior at the domain action boundary", () => {
    const logSets = getDomainActionDefinition("log_sets");
    const manageExercise = getDomainActionDefinition("manage_exercise");

    expect(
      logSets?.inputSchema.safeParse({
        action: "log_set",
        set: { exercise_name: "Bench Press", reps: 5, duration_seconds: 30 },
      }).success
    ).toBe(false);

    expect(
      manageExercise?.inputSchema.safeParse({
        action: "merge",
        source_exercise: "Bench Press",
        target_exercise: "bench press",
      }).success
    ).toBe(false);
  });
});
