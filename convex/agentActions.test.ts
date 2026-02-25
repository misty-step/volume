import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import type { TestConvex } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

describe("agentActions", () => {
  const subject = "agent_actions_user";

  async function setupLoggedSet(t: TestConvex<typeof schema>) {
    const exerciseId = await t
      .withIdentity({ subject })
      .action(api.exercises.createExercise, { name: "Bench Press" });

    const performedAt = Date.now();
    const setId = await t.withIdentity({ subject }).mutation(api.sets.logSet, {
      exerciseId,
      reps: 8,
      weight: 185,
      unit: "lbs",
      performedAt,
    });

    return { exerciseId, setId, performedAt };
  }

  test("records and undoes a single log_set action", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));
    const turnId = "turn-single";
    const { exerciseId, setId, performedAt } = await setupLoggedSet(t);

    const actionId = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.recordLogSetAction, {
        turnId,
        setId,
        exerciseId,
        exerciseName: "Bench Press",
        reps: 8,
        weight: 185,
        unit: "lbs",
        performedAt,
      });

    const beforeUndo = await t
      .withIdentity({ subject })
      .query(api.sets.listSets, { exerciseId });
    expect(beforeUndo).toHaveLength(1);

    const undoResult = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.undoAgentAction, { actionId });

    expect(undoResult.ok).toBe(true);

    const afterUndo = await t
      .withIdentity({ subject })
      .query(api.sets.listSets, { exerciseId });
    expect(afterUndo).toHaveLength(0);

    const actions = await t
      .withIdentity({ subject })
      .query(api.agentActions.listActionsForTurn, { turnId });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.status).toBe("undone");
    expect(actions[0]?.performedAt).toBe(performedAt);
  });

  test("undoAgentTurn reverts all actions in reverse order", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));
    const turnId = "turn-bulk";

    const exerciseId = await t
      .withIdentity({ subject })
      .action(api.exercises.createExercise, { name: "Squat" });

    const firstSetId = await t
      .withIdentity({ subject })
      .mutation(api.sets.logSet, {
        exerciseId,
        reps: 5,
        weight: 225,
        unit: "lbs",
      });

    const secondSetId = await t
      .withIdentity({ subject })
      .mutation(api.sets.logSet, {
        exerciseId,
        reps: 3,
        weight: 245,
        unit: "lbs",
      });

    await t
      .withIdentity({ subject })
      .mutation(api.agentActions.recordLogSetAction, {
        turnId,
        setId: firstSetId,
        exerciseId,
        exerciseName: "Squat",
        reps: 5,
        weight: 225,
        unit: "lbs",
        performedAt: Date.now() - 1000,
      });

    await t
      .withIdentity({ subject })
      .mutation(api.agentActions.recordLogSetAction, {
        turnId,
        setId: secondSetId,
        exerciseId,
        exerciseName: "Squat",
        reps: 3,
        weight: 245,
        unit: "lbs",
        performedAt: Date.now(),
      });

    const result = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.undoAgentTurn, { turnId });

    expect(result).toEqual({ ok: true, turnId, undoneCount: 2 });

    const sets = await t.withIdentity({ subject }).query(api.sets.listSets, {
      exerciseId,
    });
    expect(sets).toHaveLength(0);
  });

  test("detects conflicts when target set was deleted since recording", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));
    const turnId = "turn-conflict-missing";
    const { exerciseId, setId, performedAt } = await setupLoggedSet(t);

    const actionId = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.recordLogSetAction, {
        turnId,
        setId,
        exerciseId,
        exerciseName: "Bench Press",
        reps: 8,
        weight: 185,
        unit: "lbs",
        performedAt,
      });

    await t.withIdentity({ subject }).mutation(api.sets.deleteSet, {
      id: setId as Id<"sets">,
    });

    const result = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.undoAgentAction, { actionId });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_target");
    }
  });

  test("detects conflicts when target set fields changed since recording", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));
    const turnId = "turn-conflict-fields";
    const { exerciseId, setId, performedAt } = await setupLoggedSet(t);

    const actionId = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.recordLogSetAction, {
        turnId,
        setId,
        exerciseId,
        exerciseName: "Bench Press",
        reps: 8,
        weight: 185,
        unit: "lbs",
        performedAt,
      });

    await t.run(async (ctx) => {
      await ctx.db.patch(setId, { reps: 9 });
    });

    const result = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.undoAgentAction, { actionId });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("conflict");
    }
  });

  test("undoAgentTurn aborts when any action conflicts", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));
    const turnId = "turn-conflict-bulk";

    const exerciseId = await t
      .withIdentity({ subject })
      .action(api.exercises.createExercise, { name: "Overhead Press" });

    const firstSetId = await t
      .withIdentity({ subject })
      .mutation(api.sets.logSet, {
        exerciseId,
        reps: 5,
        weight: 95,
        unit: "lbs",
      });
    const secondSetId = await t
      .withIdentity({ subject })
      .mutation(api.sets.logSet, {
        exerciseId,
        reps: 6,
        weight: 105,
        unit: "lbs",
      });

    await t
      .withIdentity({ subject })
      .mutation(api.agentActions.recordLogSetAction, {
        turnId,
        setId: firstSetId,
        exerciseId,
        exerciseName: "Overhead Press",
        reps: 5,
        weight: 95,
        unit: "lbs",
        performedAt: Date.now() - 1000,
      });
    await t
      .withIdentity({ subject })
      .mutation(api.agentActions.recordLogSetAction, {
        turnId,
        setId: secondSetId,
        exerciseId,
        exerciseName: "Overhead Press",
        reps: 6,
        weight: 105,
        unit: "lbs",
        performedAt: Date.now(),
      });

    await t.run(async (ctx) => {
      await ctx.db.patch(firstSetId, { reps: 7 });
    });

    const result = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.undoAgentTurn, { turnId });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("conflict");
    }

    const sets = await t.withIdentity({ subject }).query(api.sets.listSets, {
      exerciseId,
    });
    expect(sets).toHaveLength(2);
  });

  test("supports legacy args.expectedSnapshot when beforeSnapshot is absent", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));
    const { setId } = await setupLoggedSet(t);

    const setDoc = await t.run(async (ctx) => {
      return await ctx.db.get(setId);
    });
    expect(setDoc).not.toBeNull();

    const actionId = await t
      .withIdentity({ subject })
      .mutation(internal.agentActions.recordAgentAction, {
        userId: subject,
        turnId: "turn-legacy-args",
        action: "log_set",
        args: {
          expectedSnapshot: {
            userId: setDoc?.userId,
            exerciseId: String(setDoc?.exerciseId),
            reps: setDoc?.reps,
            duration: setDoc?.duration,
            weight: setDoc?.weight,
            unit: setDoc?.unit,
            performedAt: setDoc?.performedAt,
          },
        },
        affectedIds: [String(setId)],
        beforeSnapshot: null,
      });

    const result = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.undoAgentAction, { actionId });

    expect(result.ok).toBe(true);
  });

  test("returns invalid_action when affected id is malformed", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    const actionId = await t
      .withIdentity({ subject })
      .mutation(internal.agentActions.recordAgentAction, {
        userId: subject,
        turnId: "turn-invalid-id",
        action: "log_set",
        args: { source: "test" },
        affectedIds: ["not_a_convex_id"],
        beforeSnapshot: null,
      });

    const result = await t
      .withIdentity({ subject })
      .mutation(api.agentActions.undoAgentAction, { actionId });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_action");
    }
  });

  test("supports internal recordAgentAction mutation", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));
    const { setId } = await setupLoggedSet(t);

    const internalActionId = await t
      .withIdentity({ subject })
      .mutation(internal.agentActions.recordAgentAction, {
        userId: subject,
        turnId: "turn-internal",
        action: "log_set",
        args: { source: "test" },
        affectedIds: [String(setId)],
        beforeSnapshot: null,
      });

    expect(internalActionId).toBeTruthy();
  });
});
