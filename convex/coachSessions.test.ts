import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import type { TestConvex } from "convex-test";
import { getTodayRangeForTimezoneOffset } from "@/lib/date-utils";

declare global {
  interface ImportMeta {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./**/*.ts");
const userSubject = "coach_user_subject";
const otherUserSubject = "other_user_subject";

function serializedMessage(role: "user" | "assistant" | "tool", text: string) {
  return JSON.stringify({
    role,
    content: [{ type: "text", text }],
  });
}

describe("coachSessions", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function seedSession(
    overrides?: Partial<{
      userId: string;
      createdAt: number;
      lastActiveAt: number;
      status: "active" | "archived";
      summary: string;
    }>
  ) {
    const now = Date.now();
    return await t.run(async (ctx) => {
      return await ctx.db.insert("coachSessions", {
        userId: overrides?.userId ?? userSubject,
        createdAt: overrides?.createdAt ?? now,
        lastActiveAt: overrides?.lastActiveAt ?? now,
        status: overrides?.status ?? "active",
        summary: overrides?.summary,
      });
    });
  }

  async function seedMessage(
    sessionId: Id<"coachSessions">,
    overrides?: Partial<{
      userId: string;
      role: "user" | "assistant" | "tool";
      content: string;
      blocks: string;
      turnId: string;
      createdAt: number;
      summarizedAt: number;
    }>
  ) {
    const now = Date.now();
    return await t.run(async (ctx) => {
      return await ctx.db.insert("coachMessages", {
        sessionId,
        userId: overrides?.userId ?? userSubject,
        role: overrides?.role ?? "user",
        content:
          overrides?.content ??
          serializedMessage(overrides?.role ?? "user", "seed message"),
        blocks: overrides?.blocks,
        turnId: overrides?.turnId,
        createdAt: overrides?.createdAt ?? now,
        summarizedAt: overrides?.summarizedAt,
      });
    });
  }

  test("getOrCreateTodaySession creates a new session for a new user", async () => {
    const result = await t
      .withIdentity({ subject: userSubject, name: "Coach User" })
      .mutation(api.coachSessions.getOrCreateTodaySession, {
        timezoneOffsetMinutes: 360,
      });

    expect(result.session.userId).toBe(userSubject);
    expect(result.session.status).toBe("active");
    expect(result.messages).toEqual([]);
  });

  test("getOrCreateTodaySession returns the existing session on the same local day", async () => {
    const sessionId = await seedSession();
    await seedMessage(sessionId, {
      role: "user",
      content: serializedMessage("user", "show today's summary"),
      createdAt: Date.now() - 10,
    });

    const result = await t
      .withIdentity({ subject: userSubject, name: "Coach User" })
      .mutation(api.coachSessions.getOrCreateTodaySession, {
        timezoneOffsetMinutes: 360,
      });

    expect(result.session._id).toBe(sessionId);
    expect(result.messages).toHaveLength(1);
    expect(JSON.parse(result.messages[0]!.content)).toEqual({
      role: "user",
      content: [{ type: "text", text: "show today's summary" }],
    });
  });

  test("getOrCreateTodaySession archives the previous active session when the day changes", async () => {
    const timezoneOffsetMinutes = 360;
    const yesterday =
      getTodayRangeForTimezoneOffset(timezoneOffsetMinutes, Date.now()).start -
      60_000;
    const oldSessionId = await seedSession({
      createdAt: yesterday,
      lastActiveAt: yesterday,
      status: "active",
    });

    const result = await t
      .withIdentity({ subject: userSubject, name: "Coach User" })
      .mutation(api.coachSessions.getOrCreateTodaySession, {
        timezoneOffsetMinutes,
      });

    expect(result.session._id).not.toBe(oldSessionId);
    expect(result.session.status).toBe("active");

    const sessions = await t.run(async (ctx) => {
      return await ctx.db
        .query("coachSessions")
        .withIndex("by_user_active", (q) => q.eq("userId", userSubject))
        .collect();
    });

    const archived = sessions.find((session) => session._id === oldSessionId);
    expect(archived?.status).toBe("archived");
  });

  test("addMessage stores a message and updates lastActiveAt", async () => {
    const sessionId = await seedSession({
      lastActiveAt: Date.now() - 60_000,
    });
    const before = Date.now();

    const messageId = await t
      .withIdentity({ subject: userSubject, name: "Coach User" })
      .mutation(api.coachSessions.addMessage, {
        sessionId,
        role: "assistant",
        content: JSON.stringify({
          role: "assistant",
          content: [{ type: "text", text: "Summary ready." }],
        }),
        blocks: JSON.stringify([
          {
            type: "metrics",
            title: "Today",
            metrics: [{ label: "Sets", value: "5" }],
          },
        ]),
        turnId: "turn_123",
      });

    const after = Date.now();
    expect(messageId).toBeDefined();

    const session = await t.run(async (ctx) => await ctx.db.get(sessionId));
    const messages = await t
      .withIdentity({ subject: userSubject, name: "Coach User" })
      .query(api.coachSessions.getSessionMessages, { sessionId });

    expect(session?.lastActiveAt).toBeGreaterThanOrEqual(before);
    expect(session?.lastActiveAt).toBeLessThanOrEqual(after);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.turnId).toBe("turn_123");
    expect(messages[0]?.blocks).toContain('"metrics"');
  });

  test("getSessionMessages returns messages in chronological order", async () => {
    const sessionId = await seedSession();
    await seedMessage(sessionId, {
      role: "user",
      content: serializedMessage("user", "first"),
      createdAt: 10,
    });
    await seedMessage(sessionId, {
      role: "assistant",
      content: serializedMessage("assistant", "second"),
      createdAt: 20,
    });
    await seedMessage(sessionId, {
      role: "tool",
      content: JSON.stringify({
        role: "tool",
        content: [{ type: "tool-result", toolName: "get_today_summary" }],
      }),
      createdAt: 30,
    });

    const messages = await t
      .withIdentity({ subject: userSubject, name: "Coach User" })
      .query(api.coachSessions.getSessionMessages, { sessionId });

    expect(messages.map((message) => message.createdAt)).toEqual([10, 20, 30]);
  });

  test("getSessionMessages rejects unauthorized access", async () => {
    const sessionId = await seedSession({ userId: userSubject });

    await expect(
      t
        .withIdentity({ subject: otherUserSubject, name: "Other User" })
        .query(api.coachSessions.getSessionMessages, { sessionId })
    ).rejects.toThrow("Not authorized to access this session");
  });

  test("addMessage rejects unauthorized access for another user's session", async () => {
    const sessionId = await seedSession({ userId: userSubject });

    await expect(
      t
        .withIdentity({ subject: otherUserSubject, name: "Other User" })
        .mutation(api.coachSessions.addMessage, {
          sessionId,
          role: "user",
          content: serializedMessage("user", "nope"),
        })
    ).rejects.toThrow("Not authorized to access this session");
  });

  test("sessions with 50+ messages return the stored summary and only the unsummarized recent window", async () => {
    const sessionId = await seedSession({
      summary: "Earlier messages: user logged sets and reviewed progress.",
    });

    for (let i = 0; i < 50; i += 1) {
      await seedMessage(sessionId, {
        role: i % 2 === 0 ? "user" : "assistant",
        content: serializedMessage(
          i % 2 === 0 ? "user" : "assistant",
          `message-${i}`
        ),
        createdAt: i,
        summarizedAt: i < 30 ? 1_000 : undefined,
      });
    }

    const result = await t
      .withIdentity({ subject: userSubject, name: "Coach User" })
      .query(api.coachSessions.getSessionMessagesForContext, { sessionId });

    expect(result.summary).toBe(
      "Earlier messages: user logged sets and reviewed progress."
    );
    expect(result.messages).toHaveLength(20);
    expect(result.messages[0]?.createdAt).toBe(30);
    expect(result.messages.at(-1)?.createdAt).toBe(49);
  });

  test("all mutations reject unauthenticated calls", async () => {
    const sessionId = await seedSession();

    await expect(
      t.mutation(api.coachSessions.getOrCreateTodaySession, {
        timezoneOffsetMinutes: 360,
      })
    ).rejects.toThrow("Unauthorized");

    await expect(
      t.mutation(api.coachSessions.addMessage, {
        sessionId,
        role: "user",
        content: serializedMessage("user", "hello"),
      })
    ).rejects.toThrow("Unauthorized");

    await expect(
      t.mutation(api.coachSessions.archiveSession, { sessionId })
    ).rejects.toThrow("Unauthorized");
  });
});
