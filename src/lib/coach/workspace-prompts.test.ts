// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  COACH_WORKSPACE_WORKFLOWS,
  findForcedCoachRouteIntent,
} from "./workspace-prompts";

describe("findForcedCoachRouteIntent", () => {
  it("matches exact workspace prompts to their forced tool routes", () => {
    for (const workflow of COACH_WORKSPACE_WORKFLOWS) {
      expect(findForcedCoachRouteIntent(workflow.prompt)).toEqual(
        workflow.forcedRoute
      );
    }
  });

  it("matches manage-exercise commands after normalizing prompt whitespace", () => {
    expect(findForcedCoachRouteIntent('  DELETE   exercise "squat"  ')).toEqual(
      { toolName: "manage_exercise" }
    );
  });

  it("does not force destructive exercise commands without a quoted name", () => {
    expect(findForcedCoachRouteIntent("delete exercise squat")).toBeNull();
    expect(findForcedCoachRouteIntent("archive exercise squat")).toBeNull();
  });

  it("matches simple reps log commands after normalizing prompt whitespace", () => {
    expect(
      findForcedCoachRouteIntent('  LOG   10   reps   of "test squat"  ')
    ).toEqual({
      toolName: "log_sets",
    });
  });

  it("matches simple delete-set commands after normalizing prompt whitespace", () => {
    expect(
      findForcedCoachRouteIntent('  DELETE   set   "test squat"  ')
    ).toEqual({
      toolName: "modify_set",
    });
  });

  it("does not force unquoted delete-set text unless it looks like a set id", () => {
    expect(findForcedCoachRouteIntent("delete set test squat")).toBeNull();
    expect(findForcedCoachRouteIntent("delete set abc123")).toBeNull();
    expect(
      findForcedCoachRouteIntent("delete set j9711x7g1bb5y4990wh4hjwfjd85cmag")
    ).toEqual({ toolName: "modify_set" });
  });
});
