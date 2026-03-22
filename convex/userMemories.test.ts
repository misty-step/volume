import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { TestConvex } from "convex-test";
import type { Id } from "./_generated/dataModel";

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

  test("listActive rejects cross-user access", async () => {
    await seedMemory();

    await expect(
      t
        .withIdentity({ subject: otherUserSubject, name: "Other User" })
        .query(api.userMemories.listActive, {})
    ).resolves.toEqual([]);
  });
});
