import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v, type Validator } from "convex/values";
import { requireAuth } from "./lib/validate";
import {
  isObservationMemory,
  MAX_ACTIVE_FACT_MEMORIES,
  MAX_ACTIVE_OBSERVATIONS,
  MAX_MEMORY_CONTENT_LENGTH,
  MEMORY_CATEGORIES,
  MEMORY_SOURCES,
  normalizeMemoryContent,
  RECENT_OBSERVATION_LIMIT,
  type MemoryCategory,
  type MemorySource,
} from "@/lib/coach/memory";

type UserMemoryDoc = Doc<"userMemories">;

const memoryCategoryValidator = v.union(
  ...(MEMORY_CATEGORIES.map((category) => v.literal(category)) as [
    Validator<MemoryCategory>,
    ...Validator<MemoryCategory>[],
  ])
);

const memorySourceValidator = v.union(
  ...(MEMORY_SOURCES.map((source) => v.literal(source)) as [
    Validator<MemorySource>,
    ...Validator<MemorySource>[],
  ])
);

const memoryOperationValidator = v.union(
  v.object({
    kind: v.literal("remember"),
    category: memoryCategoryValidator,
    content: v.string(),
    source: v.union(v.literal("fact_extractor"), v.literal("explicit_user")),
    existingMemoryId: v.optional(v.id("userMemories")),
  }),
  v.object({
    kind: v.literal("forget"),
    memoryId: v.id("userMemories"),
  })
);

async function getActiveMemoriesForUser(
  ctx: QueryCtx | MutationCtx,
  userId: string
): Promise<UserMemoryDoc[]> {
  return await ctx.db
    .query("userMemories")
    .withIndex("by_user_deleted_created", (q) =>
      q.eq("userId", userId).eq("deletedAt", undefined)
    )
    .order("asc")
    .collect();
}

function normalizeForMatch(content: string) {
  return normalizeMemoryContent(content).toLowerCase();
}

function contentMatchesQuery(memoryContent: string, queryContent: string) {
  const normalizedMemory = normalizeForMatch(memoryContent);
  const normalizedQuery = normalizeForMatch(queryContent);
  if (!normalizedQuery) return false;

  if (
    normalizedMemory === normalizedQuery ||
    normalizedMemory.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedMemory)
  ) {
    return true;
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return queryTokens.length > 0
    ? queryTokens.every((token) => normalizedMemory.includes(token))
    : false;
}

function uniqueIds(ids: string[] | undefined) {
  return ids ? Array.from(new Set(ids)) : [];
}

async function trimFactMemories(
  ctx: MutationCtx,
  activeMemories: UserMemoryDoc[],
  now: number
) {
  const activeFacts = activeMemories.filter(
    (memory: UserMemoryDoc) => !isObservationMemory(memory)
  );
  const overflow = activeFacts.length - MAX_ACTIVE_FACT_MEMORIES;
  if (overflow <= 0) {
    return;
  }

  const memoriesToTrim = activeFacts.slice(0, overflow);
  const trimmedIds = new Set(
    memoriesToTrim.map((memory) => String(memory._id))
  );

  await Promise.all(
    memoriesToTrim.map((memory: UserMemoryDoc) =>
      ctx.db.patch(memory._id, {
        deletedAt: now,
      })
    )
  );

  for (let index = activeMemories.length - 1; index >= 0; index -= 1) {
    const memory = activeMemories[index];
    if (memory && trimmedIds.has(String(memory._id))) {
      activeMemories.splice(index, 1);
    }
  }
}

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    return await getActiveMemoriesForUser(ctx, identity.subject);
  },
});

export const listForPrompt = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    const activeMemories = await getActiveMemoriesForUser(
      ctx,
      identity.subject
    );

    return {
      memories: activeMemories
        .filter((memory: UserMemoryDoc) => !isObservationMemory(memory))
        .slice(-MAX_ACTIVE_FACT_MEMORIES)
        .map(
          ({ _id, category, content, source, createdAt }: UserMemoryDoc) => ({
            _id,
            category,
            content,
            source,
            createdAt,
          })
        ),
      observations: activeMemories
        .filter((memory: UserMemoryDoc) => isObservationMemory(memory))
        .slice(-RECENT_OBSERVATION_LIMIT)
        .map((memory: UserMemoryDoc) => memory.content),
    };
  },
});

export const rememberExplicitMemory = mutation({
  args: {
    category: memoryCategoryValidator,
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const now = Date.now();
    const content = normalizeMemoryContent(args.content);
    if (!content) {
      throw new Error("Memory content is required");
    }

    const activeMemories = await getActiveMemoriesForUser(
      ctx,
      identity.subject
    );
    const existingMemory = activeMemories.find(
      (memory: UserMemoryDoc) =>
        !isObservationMemory(memory) &&
        memory.category === args.category &&
        normalizeForMatch(memory.content) === normalizeForMatch(content)
    );

    if (existingMemory) {
      return { created: false, memoryId: existingMemory._id };
    }

    const memoryId = await ctx.db.insert("userMemories", {
      userId: identity.subject,
      category: args.category,
      content,
      source: "explicit_user",
      createdAt: now,
    });
    activeMemories.push({
      _id: memoryId,
      _creationTime: now,
      userId: identity.subject,
      category: args.category,
      content,
      source: "explicit_user",
      createdAt: now,
    });
    await trimFactMemories(ctx, activeMemories, now);

    return { created: true, memoryId };
  },
});

export const forgetMemoryByContent = mutation({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const now = Date.now();
    const activeMemories = await getActiveMemoriesForUser(
      ctx,
      identity.subject
    );

    const matchingMemories = activeMemories.filter(
      (memory: UserMemoryDoc) =>
        !isObservationMemory(memory) &&
        contentMatchesQuery(memory.content, args.content)
    );

    await Promise.all(
      matchingMemories.map((memory: UserMemoryDoc) =>
        ctx.db.patch(memory._id, {
          deletedAt: now,
        })
      )
    );

    return { deletedCount: matchingMemories.length };
  },
});

export const applyMemoryPipelineResult = mutation({
  args: {
    operations: v.array(memoryOperationValidator),
    observation: v.optional(v.string()),
    keepObservationIds: v.optional(v.array(v.id("userMemories"))),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const userId = identity.subject;
    const now = Date.now();
    const activeMemories = [...(await getActiveMemoriesForUser(ctx, userId))];

    for (const operation of args.operations) {
      if (operation.kind === "forget") {
        const memory = await ctx.db.get(operation.memoryId);
        if (
          memory &&
          memory.userId === userId &&
          memory.deletedAt === undefined
        ) {
          await ctx.db.patch(memory._id, {
            deletedAt: now,
          });
          const index = activeMemories.findIndex(
            (activeMemory) => activeMemory._id === memory._id
          );
          if (index >= 0) {
            activeMemories.splice(index, 1);
          }
        }
        continue;
      }

      const content = normalizeMemoryContent(operation.content).slice(
        0,
        MAX_MEMORY_CONTENT_LENGTH
      );
      if (!content) {
        continue;
      }

      if (operation.existingMemoryId) {
        const existingMemory = await ctx.db.get(operation.existingMemoryId);
        if (
          existingMemory &&
          existingMemory.userId === userId &&
          existingMemory.deletedAt === undefined
        ) {
          await ctx.db.patch(existingMemory._id, {
            deletedAt: now,
          });
          const index = activeMemories.findIndex(
            (activeMemory) => activeMemory._id === existingMemory._id
          );
          if (index >= 0) {
            activeMemories.splice(index, 1);
          }
        }
      }

      const duplicate = activeMemories.find(
        (memory: UserMemoryDoc) =>
          !isObservationMemory(memory) &&
          memory.category === operation.category &&
          normalizeForMatch(memory.content) === normalizeForMatch(content)
      );

      if (!duplicate) {
        const memoryId = await ctx.db.insert("userMemories", {
          userId,
          category: operation.category,
          content,
          source: operation.source,
          createdAt: now,
        });
        activeMemories.push({
          _id: memoryId,
          _creationTime: now,
          userId,
          category: operation.category,
          content,
          source: operation.source,
          createdAt: now,
        });
      }
    }

    await trimFactMemories(ctx, activeMemories, now);

    let insertedObservationId: Id<"userMemories"> | null = null;
    const observationContent = normalizeMemoryContent(
      args.observation ?? ""
    ).slice(0, MAX_MEMORY_CONTENT_LENGTH);
    if (observationContent) {
      insertedObservationId = await ctx.db.insert("userMemories", {
        userId,
        category: "other",
        content: observationContent,
        source: "observer",
        createdAt: now,
      });
    }

    const observerMemories = await getActiveMemoriesForUser(ctx, userId);
    const activeObservations = observerMemories.filter(
      (memory: UserMemoryDoc) => isObservationMemory(memory)
    );

    if (args.keepObservationIds !== undefined) {
      const keepSet = new Set(uniqueIds(args.keepObservationIds.map(String)));
      if (insertedObservationId) {
        keepSet.add(String(insertedObservationId));
      }
      const keptObservations = activeObservations.filter((memory) =>
        keepSet.has(String(memory._id))
      );
      const minKeepCount = Math.min(
        MAX_ACTIVE_OBSERVATIONS,
        activeObservations.length
      );
      if (keptObservations.length >= minKeepCount) {
        const keepOverflow = keptObservations.length - MAX_ACTIVE_OBSERVATIONS;
        if (keepOverflow > 0) {
          for (const memory of keptObservations.slice(0, keepOverflow)) {
            keepSet.delete(String(memory._id));
          }
        }
        await Promise.all(
          activeObservations
            .filter((memory: UserMemoryDoc) => !keepSet.has(String(memory._id)))
            .map((memory: UserMemoryDoc) =>
              ctx.db.patch(memory._id, {
                deletedAt: now,
              })
            )
        );
        return {
          appliedOperations: args.operations.length,
          observationStored: Boolean(insertedObservationId),
        };
      }
    }

    const overflow = activeObservations.length - MAX_ACTIVE_OBSERVATIONS;
    if (overflow > 0) {
      // Active memories are loaded oldest-first, so trimming from the front
      // drops stale observations and preserves the newest summaries.
      await Promise.all(
        activeObservations.slice(0, overflow).map((memory: UserMemoryDoc) =>
          ctx.db.patch(memory._id, {
            deletedAt: now,
          })
        )
      );
    }

    return {
      appliedOperations: args.operations.length,
      observationStored: Boolean(insertedObservationId),
    };
  },
});
