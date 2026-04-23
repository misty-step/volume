// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  DomainActionError,
  executeDomainAction,
  type DomainActionPrincipal,
  type DomainActionRunnerMap,
} from "@/lib/domain/actions/execute";

const PUBLIC_PRINCIPAL: DomainActionPrincipal = {
  userId: "user_1",
  authProvider: "clerk_api_key",
  scopes: [
    "sets:read",
    "sets:write",
    "exercises:read",
    "exercises:write",
    "profile:read",
  ],
};

describe("executeDomainAction", () => {
  it("validates and passes parsed action args to the registered runner", async () => {
    const context = {
      convex: {
        mutation: vi.fn().mockResolvedValue({ ok: true }),
      },
    };
    const audit = vi.fn();
    const runners = {
      log_sets: vi.fn(async (args, request) => {
        await request.context.convex.mutation("sets.log", args);
        return { ok: true, userId: request.principal.userId };
      }),
    } satisfies DomainActionRunnerMap<typeof context, unknown>;

    const result = await executeDomainAction({
      name: "log_sets",
      rawArgs: {
        action: "log_set",
        set: { exercise_name: " Bench Press ", reps: 5 },
      },
      principal: PUBLIC_PRINCIPAL,
      exposure: "public",
      context,
      runners,
      audit,
    });

    expect(result).toEqual({ ok: true, userId: "user_1" });
    expect(context.convex.mutation).toHaveBeenCalledWith("sets.log", {
      action: "log_set",
      set: { exercise_name: "Bench Press", reps: 5 },
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionName: "log_sets",
        userId: "user_1",
        authProvider: "clerk_api_key",
        scopes: ["sets:write"],
        auditCategory: "sets",
        idempotency: "client_optional",
        outcome: "success",
        durationMs: expect.any(Number),
      })
    );
  });

  it("rejects invalid inputs before calling the runner", async () => {
    const runner = vi.fn();

    const execution = executeDomainAction({
      name: "log_sets",
      rawArgs: {
        action: "log_set",
        set: { exercise_name: "Bench Press", reps: 5, duration_seconds: 30 },
      },
      principal: PUBLIC_PRINCIPAL,
      exposure: "public",
      context: {},
      runners: { log_sets: runner },
    });

    await expect(execution).rejects.toBeInstanceOf(DomainActionError);
    await expect(execution).rejects.toMatchObject({
      code: "invalid_action_args",
      status: 400,
    });
    expect(runner).not.toHaveBeenCalled();
  });

  it("rejects actions outside the requested exposure", async () => {
    const runner = vi.fn();

    const execution = executeDomainAction({
      name: "update_settings",
      rawArgs: { action: "weight_unit", unit: "kg" },
      principal: {
        userId: "user_1",
        authProvider: "clerk_session",
        scopes: ["profile:write"],
      },
      exposure: "public",
      context: {},
      runners: { update_settings: runner },
    });

    await expect(execution).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
    expect(runner).not.toHaveBeenCalled();
  });

  it("rejects principals missing the action scope", async () => {
    const runner = vi.fn();

    const execution = executeDomainAction({
      name: "manage_exercise",
      rawArgs: { action: "delete", exercise_name: "Bench Press" },
      principal: {
        userId: "user_1",
        authProvider: "first_party_api_key",
        scopes: ["exercises:read"],
      },
      exposure: "public",
      context: {},
      runners: { manage_exercise: runner },
    });

    await expect(execution).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
    expect(runner).not.toHaveBeenCalled();
  });
});
