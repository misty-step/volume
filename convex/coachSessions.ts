import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getTodayRangeForTimezoneOffset } from "@/lib/date-utils";
import { requireAuth, requireOwnership } from "./lib/validate";

const CONTEXT_WINDOW_MESSAGES = 20;

export const getOrCreateTodaySession = mutation({
  args: {
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    if (
      !Number.isInteger(args.timezoneOffsetMinutes) ||
      args.timezoneOffsetMinutes < -840 ||
      args.timezoneOffsetMinutes > 840
    ) {
      throw new Error("Invalid timezone offset");
    }

    const identity = await requireAuth(ctx);
    const userId = identity.subject;
    const now = Date.now();
    const todayRange = getTodayRangeForTimezoneOffset(
      args.timezoneOffsetMinutes,
      now
    );

    const activeSessions = await ctx.db
      .query("coachSessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .collect();

    const todaySession = activeSessions.find(
      (session) =>
        session.lastActiveAt >= todayRange.start &&
        session.lastActiveAt <= todayRange.end
    );

    if (todaySession) {
      const messages = await ctx.db
        .query("coachMessages")
        .withIndex("by_session", (q) => q.eq("sessionId", todaySession._id))
        .order("asc")
        .collect();

      return {
        session: todaySession,
        messages,
      };
    }

    await Promise.all(
      activeSessions.map((session) =>
        ctx.db.patch(session._id, {
          status: "archived",
        })
      )
    );

    const sessionId = await ctx.db.insert("coachSessions", {
      userId,
      createdAt: now,
      lastActiveAt: now,
      status: "active",
    });

    const session = await ctx.db.get(sessionId);
    if (!session) {
      throw new Error("Failed to create coach session");
    }

    return {
      session,
      messages: [],
    };
  },
});

export const addMessage = mutation({
  args: {
    sessionId: v.id("coachSessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    content: v.string(),
    blocks: v.optional(v.string()),
    turnId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const userId = identity.subject;
    const session = await ctx.db.get(args.sessionId);
    requireOwnership(session, userId, "session");
    if (session.status !== "active") {
      throw new Error("Cannot add messages to an archived session");
    }
    const createdAt = Date.now();

    const messageId = await ctx.db.insert("coachMessages", {
      sessionId: args.sessionId,
      userId,
      role: args.role,
      content: args.content,
      blocks: args.blocks,
      turnId: args.turnId,
      createdAt,
    });

    await ctx.db.patch(session._id, {
      lastActiveAt: Math.max(session.lastActiveAt, createdAt),
    });

    return messageId;
  },
});

export const getSessionMessages = query({
  args: {
    sessionId: v.id("coachSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    requireOwnership(session, identity.subject, "session");

    return await ctx.db
      .query("coachMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

export const getSessionMessagesForContext = query({
  args: {
    sessionId: v.id("coachSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    requireOwnership(session, identity.subject, "session");
    const messages = await ctx.db
      .query("coachMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    const recentMessages = messages
      .filter((message) => message.summarizedAt === undefined)
      .slice(-CONTEXT_WINDOW_MESSAGES);

    return {
      session,
      summary: session.summary ?? null,
      messages: recentMessages,
    };
  },
});

export const applySummary = mutation({
  args: {
    sessionId: v.id("coachSessions"),
    summary: v.string(),
    summarizeThroughCreatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    requireOwnership(session, identity.subject, "session");
    const summarizedAt = Date.now();
    const messages = await ctx.db
      .query("coachMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    await Promise.all(
      messages
        .filter(
          (message) =>
            message.createdAt <= args.summarizeThroughCreatedAt &&
            message.summarizedAt === undefined
        )
        .map((message) =>
          ctx.db.patch(message._id, {
            summarizedAt,
          })
        )
    );

    await ctx.db.patch(session._id, {
      summary: args.summary,
    });

    return {
      summary: args.summary,
      summarizedAt,
    };
  },
});

export const archiveSession = mutation({
  args: {
    sessionId: v.id("coachSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    requireOwnership(session, identity.subject, "session");

    await ctx.db.patch(session._id, {
      status: "archived",
    });
  },
});
