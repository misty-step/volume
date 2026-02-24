import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAuth, requireOwnership } from "./lib/validate";

type AgentActionDoc = Doc<"agentActions">;

type UndoValidationResult =
  | { ok: true; setId: Id<"sets"> }
  | { ok: false; reason: string; message: string };

function validateLogSetUndo(
  action: AgentActionDoc,
  setDoc: Doc<"sets"> | null
): UndoValidationResult {
  const target = action.affectedIds[0];
  if (!target) {
    return {
      ok: false,
      reason: "invalid_action",
      message: "Missing affected set id.",
    };
  }

  if (!setDoc) {
    return {
      ok: false,
      reason: "missing_target",
      message: "Set no longer exists, so undo cannot be applied safely.",
    };
  }

  const expected =
    action.args &&
    typeof action.args === "object" &&
    "expectedSnapshot" in action.args
      ? (action.args.expectedSnapshot as Partial<Doc<"sets">>)
      : null;

  if (!expected) {
    return { ok: true, setId: target as Id<"sets"> };
  }

  const mismatched =
    setDoc.userId !== expected.userId ||
    String(setDoc.exerciseId) !== String(expected.exerciseId) ||
    setDoc.reps !== expected.reps ||
    setDoc.duration !== expected.duration ||
    setDoc.weight !== expected.weight ||
    setDoc.unit !== expected.unit ||
    setDoc.performedAt !== expected.performedAt;

  if (mismatched) {
    return {
      ok: false,
      reason: "conflict",
      message:
        "Set changed after the coach action. Review the latest value before undoing.",
    };
  }

  return { ok: true, setId: target as Id<"sets"> };
}

export const recordAgentAction = internalMutation({
  args: {
    userId: v.string(),
    turnId: v.string(),
    action: v.union(v.literal("log_set")),
    args: v.any(),
    affectedIds: v.array(v.string()),
    beforeSnapshot: v.optional(v.any()),
    performedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentActions", {
      userId: args.userId,
      turnId: args.turnId,
      action: args.action,
      args: args.args,
      affectedIds: args.affectedIds,
      beforeSnapshot: args.beforeSnapshot,
      status: "committed",
      performedAt: args.performedAt ?? Date.now(),
    });
  },
});

export const recordLogSetAction = mutation({
  args: {
    turnId: v.string(),
    setId: v.id("sets"),
    exerciseId: v.id("exercises"),
    exerciseName: v.string(),
    reps: v.optional(v.number()),
    duration: v.optional(v.number()),
    weight: v.optional(v.number()),
    unit: v.optional(v.string()),
    performedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const setDoc = await ctx.db.get(args.setId);
    requireOwnership(setDoc, identity.subject, "set");

    return await ctx.db.insert("agentActions", {
      userId: identity.subject,
      turnId: args.turnId,
      action: "log_set",
      args: {
        ...args,
        expectedSnapshot: setDoc,
      },
      affectedIds: [String(args.setId)],
      beforeSnapshot: null,
      status: "committed",
      performedAt: Date.now(),
    });
  },
});

export const undoAgentAction = mutation({
  args: {
    actionId: v.id("agentActions"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const action = await ctx.db.get(args.actionId);
    requireOwnership(action, identity.subject, "agent action");
    if (!action) {
      return {
        ok: false,
        reason: "not_found",
        message: "Action not found.",
      } as const;
    }

    if (action.status === "undone") {
      return {
        ok: false,
        reason: "already_undone",
        message: "That action was already undone.",
      } as const;
    }

    if (action.action !== "log_set") {
      return {
        ok: false,
        reason: "unsupported_action",
        message: `Undo is not implemented for ${action.action}.`,
      } as const;
    }

    const setId = action.affectedIds[0] as Id<"sets"> | undefined;
    const setDoc = setId ? await ctx.db.get(setId) : null;
    const validation = validateLogSetUndo(action, setDoc);
    if (!validation.ok) {
      return validation;
    }

    await ctx.db.delete(validation.setId);
    await ctx.db.patch(action._id, {
      status: "undone",
      undoneAt: Date.now(),
    });

    return {
      ok: true,
      actionId: action._id,
      turnId: action.turnId,
    } as const;
  },
});

export const undoAgentTurn = mutation({
  args: {
    turnId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const actions = await ctx.db
      .query("agentActions")
      .withIndex("by_user_turn", (q) =>
        q.eq("userId", identity.subject).eq("turnId", args.turnId)
      )
      .collect();

    const committed = actions
      .filter((action) => action.status === "committed")
      .sort((a, b) => b.performedAt - a.performedAt);

    for (const action of committed) {
      if (action.action !== "log_set") {
        return {
          ok: false,
          reason: "unsupported_action",
          message: `Undo is not implemented for ${action.action}.`,
        } as const;
      }

      const setId = action.affectedIds[0] as Id<"sets"> | undefined;
      const setDoc = setId ? await ctx.db.get(setId) : null;
      const validation = validateLogSetUndo(action, setDoc);
      if (!validation.ok) {
        return {
          ...validation,
          actionId: action._id,
        } as const;
      }
    }

    const undoneAt = Date.now();
    for (const action of committed) {
      const setId = action.affectedIds[0] as Id<"sets">;
      await ctx.db.delete(setId);
      await ctx.db.patch(action._id, { status: "undone", undoneAt });
    }

    return {
      ok: true,
      turnId: args.turnId,
      undoneCount: committed.length,
    } as const;
  },
});

export const listActionsForTurn = query({
  args: { turnId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("agentActions")
      .withIndex("by_user_turn", (q) =>
        q.eq("userId", identity.subject).eq("turnId", args.turnId)
      )
      .order("desc")
      .collect();
  },
});
