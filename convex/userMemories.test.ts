import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { TestConvex } from "convex-test";
import type { Id } from "./_generated/dataModel";
import { MAX_ACTIVE_FACT_MEMORIES } from "@/lib/coach/memory";

declare global {
  interface ImportMeta {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./**/*.ts");
const userSubject = "memory_user_subject";
const otherUserSubject = "memory_other_user_subject";

describe("userMemories", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function seedMemory(
    overrides?: Partial<{
      userId: string;
      category:
        | "injury"
        | "goal"
        | "preference"
        | "training_history"
        | "body_composition"
        | "other";
      content: string;
      source: "fact_extractor" | "explicit_user" | "observer";
      createdAt: number;
      deletedAt: number;
    }>
  ) {
    const now = Date.now();
    return await t.run(async (ctx) => {
      return await ctx.db.insert("userMemories", {
        userId: overrides?.userId ?? userSubject,
        category: overrides?.category ?? "injury",
        content: overrides?.content ?? "Left shoulder has been bothering them",
        source: overrides?.source ?? "fact_extractor",
        createdAt: overrides?.createdAt ?? now,
        deletedAt: overrides?.deletedAt,
      });
    });
  }

  test("listForPrompt returns active memories and bounded recent observations", async () => {
    await seedMemory({
      category: "injury",
      content: "Left shoulder pain. Avoid heavy overhead pressing.",
      createdAt: 1,
    });
    await seedMemory({
      category: "goal",
      content: "Training for a half marathon in June.",
      createdAt: 2,
    });

    for (let i = 0; i < 5; i += 1) {
      await seedMemory({
        category: "other",
        content: `Observation ${i}`,
        source: "observer",
        createdAt: 100 + i,
      });
    }

    const result = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .query(api.userMemories.listForPrompt, {});

    expect(result.memories).toHaveLength(2);
    expect(result.memories.map((memory) => memory.content)).toEqual([
      "Left shoulder pain. Avoid heavy overhead pressing.",
      "Training for a half marathon in June.",
    ]);
    expect(result.observations).toEqual([
      "Observation 2",
      "Observation 3",
      "Observation 4",
    ]);
  });

  test("rememberExplicitMemory returns created false for normalized duplicates", async () => {
    const existingMemoryId = await seedMemory({
      category: "injury",
      content: "Left shoulder pain. Avoid heavy overhead pressing.",
      source: "explicit_user",
      createdAt: 1,
    });

    const result = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.rememberExplicitMemory, {
        category: "injury",
        content: "  Left   shoulder pain.\nAvoid heavy overhead pressing.  ",
      });

    expect(result).toEqual({
      created: false,
      memoryId: existingMemoryId,
    });

    const activeMemories = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .query(api.userMemories.listActive, {});

    expect(activeMemories).toHaveLength(1);
  });

  test("rememberExplicitMemory trims the oldest fact memory once storage exceeds the cap", async () => {
    for (let i = 0; i < MAX_ACTIVE_FACT_MEMORIES; i += 1) {
      await seedMemory({
        category: "goal",
        content: `Goal memory ${i}`,
        source: "explicit_user",
        createdAt: i,
      });
    }

    await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.rememberExplicitMemory, {
        category: "goal",
        content: "Newest goal memory",
      });

    const activeFacts = (
      await t
        .withIdentity({ subject: userSubject, name: "Memory User" })
        .query(api.userMemories.listActive, {})
    )
      .filter((memory) => memory.source !== "observer")
      .map((memory) => memory.content);

    expect(activeFacts).toHaveLength(MAX_ACTIVE_FACT_MEMORIES);
    expect(activeFacts).not.toContain("Goal memory 0");
    expect(activeFacts.at(-1)).toBe("Newest goal memory");
  });

  test("applyMemoryPipelineResult stores extracted memories and forgets by id", async () => {
    const existingMemoryId = await seedMemory({
      category: "injury",
      content: "Left shoulder has been bothering them.",
      createdAt: 1,
    });

    await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.applyMemoryPipelineResult, {
        operations: [
          {
            kind: "forget",
            memoryId: existingMemoryId,
          },
          {
            kind: "remember",
            category: "injury",
            content:
              "Left shoulder impingement. Avoid heavy overhead pressing.",
            source: "fact_extractor",
          },
        ],
      });

    const activeMemories = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .query(api.userMemories.listActive, {});

    expect(activeMemories).toHaveLength(1);
    expect(activeMemories[0]?.content).toContain(
      "Avoid heavy overhead pressing"
    );
    expect(activeMemories[0]?._id).not.toBe(existingMemoryId);
  });

  test("applyMemoryPipelineResult trims the oldest fact memory after new remembers", async () => {
    for (let i = 0; i < MAX_ACTIVE_FACT_MEMORIES; i += 1) {
      await seedMemory({
        category: "goal",
        content: `Goal memory ${i}`,
        source: "fact_extractor",
        createdAt: i,
      });
    }

    await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.applyMemoryPipelineResult, {
        operations: [
          {
            kind: "remember",
            category: "goal",
            content: "Newest goal memory",
            source: "fact_extractor",
          },
        ],
      });

    const activeFacts = (
      await t
        .withIdentity({ subject: userSubject, name: "Memory User" })
        .query(api.userMemories.listActive, {})
    )
      .filter((memory) => memory.source !== "observer")
      .map((memory) => memory.content);

    expect(activeFacts).toHaveLength(MAX_ACTIVE_FACT_MEMORIES);
    expect(activeFacts).not.toContain("Goal memory 0");
    expect(activeFacts.at(-1)).toBe("Newest goal memory");
  });

  test("applyMemoryPipelineResult keeps observations under 30", async () => {
    const keepIds: Id<"userMemories">[] = [];

    for (let i = 0; i < 50; i += 1) {
      const id = await seedMemory({
        category: "other",
        content: `Older observation ${i}`,
        source: "observer",
        createdAt: i,
      });

      if (i >= 21 && i < 50) {
        keepIds.push(id);
      }
    }

    await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.applyMemoryPipelineResult, {
        operations: [],
        observation: "Latest observation summary",
        keepObservationIds: keepIds,
      });

    const activeMemories = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .query(api.userMemories.listActive, {});

    const activeObservations = activeMemories.filter(
      (memory) => memory.source === "observer"
    );

    expect(activeObservations).toHaveLength(30);
    expect(activeObservations.at(-1)?.content).toBe(
      "Latest observation summary"
    );
  });

  test("applyMemoryPipelineResult enforces the observation cap even when keep ids overflow", async () => {
    const keepIds: Id<"userMemories">[] = [];

    for (let i = 0; i < 30; i += 1) {
      keepIds.push(
        await seedMemory({
          category: "other",
          content: `Observation ${i}`,
          source: "observer",
          createdAt: i,
        })
      );
    }

    await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.applyMemoryPipelineResult, {
        operations: [],
        observation: "Latest observation summary",
        keepObservationIds: keepIds,
      });

    const activeObservations = (
      await t
        .withIdentity({ subject: userSubject, name: "Memory User" })
        .query(api.userMemories.listActive, {})
    )
      .filter((memory) => memory.source === "observer")
      .map((memory) => memory.content);

    expect(activeObservations).toHaveLength(30);
    expect(activeObservations).not.toContain("Observation 0");
    expect(activeObservations.at(-1)).toBe("Latest observation summary");
  });

  test("applyMemoryPipelineResult honors selective keep ids below the cap", async () => {
    const keepIds: Id<"userMemories">[] = [];

    for (let i = 0; i < 30; i += 1) {
      const id = await seedMemory({
        category: "other",
        content: `Observation ${i}`,
        source: "observer",
        createdAt: i,
      });

      if (i < 5) {
        keepIds.push(id);
      }
    }

    await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.applyMemoryPipelineResult, {
        operations: [],
        observation: "Latest observation summary",
        keepObservationIds: keepIds,
      });

    const activeObservations = (
      await t
        .withIdentity({ subject: userSubject, name: "Memory User" })
        .query(api.userMemories.listActive, {})
    )
      .filter((memory) => memory.source === "observer")
      .map((memory) => memory.content);

    expect(activeObservations).toEqual([
      "Observation 0",
      "Observation 1",
      "Observation 2",
      "Observation 3",
      "Observation 4",
      "Latest observation summary",
    ]);
  });

  test("applyMemoryPipelineResult preserves existing observations when no keep list is provided", async () => {
    await seedMemory({
      category: "other",
      content: "Existing observation 1",
      source: "observer",
      createdAt: 1,
    });
    await seedMemory({
      category: "other",
      content: "Existing observation 2",
      source: "observer",
      createdAt: 2,
    });

    await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.applyMemoryPipelineResult, {
        operations: [],
        observation: "Latest observation summary",
      });

    const activeMemories = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .query(api.userMemories.listActive, {});

    const activeObservations = activeMemories
      .filter((memory) => memory.source === "observer")
      .map((memory) => memory.content);

    expect(activeObservations).toEqual([
      "Existing observation 1",
      "Existing observation 2",
      "Latest observation summary",
    ]);
  });

  test("applyMemoryPipelineResult trims the oldest observations when the active list overflows", async () => {
    for (let i = 0; i < 31; i += 1) {
      await seedMemory({
        category: "other",
        content: `Observation ${i}`,
        source: "observer",
        createdAt: i,
      });
    }

    await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.applyMemoryPipelineResult, {
        operations: [],
        observation: "Observation 31",
      });

    const activeObservations = (
      await t
        .withIdentity({ subject: userSubject, name: "Memory User" })
        .query(api.userMemories.listActive, {})
    )
      .filter((memory) => memory.source === "observer")
      .map((memory) => memory.content);

    expect(activeObservations).toHaveLength(30);
    expect(activeObservations).toEqual(
      Array.from({ length: 30 }, (_, index) => `Observation ${index + 2}`)
    );
  });
  test("forgetMemoryByContent deletes partial and exact matches only for the current user", async () => {
    await seedMemory({
      category: "injury",
      content: "Left shoulder impingement. Avoid heavy overhead pressing.",
      source: "explicit_user",
      createdAt: 1,
    });
    await seedMemory({
      category: "injury",
      content: "Right shoulder still needs lighter overhead pressing days.",
      source: "explicit_user",
      createdAt: 2,
    });
    await seedMemory({
      category: "goal",
      content: "Training for a half marathon in June.",
      source: "explicit_user",
      createdAt: 3,
    });
    await seedMemory({
      userId: otherUserSubject,
      category: "injury",
      content: "Left shoulder impingement. Avoid heavy overhead pressing.",
      source: "explicit_user",
      createdAt: 4,
    });

    const result = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.forgetMemoryByContent, {
        content: "shoulder overhead",
      });

    expect(result).toEqual({ deletedCount: 2 });

    const userMemories = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .query(api.userMemories.listActive, {});
    expect(userMemories.map((memory) => memory.content)).toEqual([
      "Training for a half marathon in June.",
    ]);

    const exactMatch = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.forgetMemoryByContent, {
        content: "Training for a half marathon in June.",
      });
    expect(exactMatch).toEqual({ deletedCount: 1 });

    const miss = await t
      .withIdentity({ subject: userSubject, name: "Memory User" })
      .mutation(api.userMemories.forgetMemoryByContent, {
        content: "nonexistent memory",
      });
    expect(miss).toEqual({ deletedCount: 0 });

    const otherUserMemories = await t
      .withIdentity({ subject: otherUserSubject, name: "Other User" })
      .query(api.userMemories.listActive, {});
    expect(otherUserMemories).toHaveLength(1);
  });
  test("forgetMemoryByContent rejects unauthenticated callers", async () => {
    await expect(
      t.mutation(api.userMemories.forgetMemoryByContent, {
        content: "shoulder overhead",
      })
    ).rejects.toThrow("Not authenticated");
  });
  test("listActive rejects cross-user access", async () => {
    await seedMemory();

    await expect(
      t
        .withIdentity({ subject: otherUserSubject, name: "Other User" })
        .query(api.userMemories.listActive, {})
    ).resolves.toEqual([]);
  });
});
