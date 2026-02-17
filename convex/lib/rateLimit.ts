import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";

export type RateLimitScope = "exercise:create" | "aiReport:onDemand" | string;

export type RateLimitConfig = {
  scope: RateLimitScope;
  windowMs: number;
  limit: number;
  exempt?: boolean;
};

export type RateLimitResult = {
  remaining: number;
  resetAt: number;
};

export class RateLimitError extends Error {
  scope: RateLimitScope;
  limit: number;
  count: number;
  retryAfterMs: number;
  resetAt: number;

  constructor(options: {
    scope: RateLimitScope;
    limit: number;
    count: number;
    retryAfterMs: number;
    resetAt: number;
  }) {
    super(
      `Rate limit exceeded for ${options.scope}: ${options.count}/${options.limit}, retry after ${new Date(
        options.resetAt
      ).toISOString()}`
    );
    this.scope = options.scope;
    this.limit = options.limit;
    this.count = options.count;
    this.retryAfterMs = options.retryAfterMs;
    this.resetAt = options.resetAt;
  }
}

// Rate limiting requires write access; QueryCtx is not supported
type Ctx = MutationCtx;

type RateLimitRecord = {
  _id: Id<"rateLimits">;
  userId: string;
  scope: RateLimitScope;
  windowStartMs: number;
  windowMs: number;
  count: number;
  expiresAt: number;
};

/**
 * Simple hash of userId for logging without exposing PII.
 * Uses djb2 algorithm - fast, deterministic, no Node dependencies.
 */
function hashUserId(userId: string): string {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) + hash + userId.charCodeAt(i);
    hash = hash & 0xffffffff; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8);
}

const DEFAULT_LIMITS: Record<
  RateLimitScope,
  { limit: number; windowMs: number }
> = {
  "exercise:create": { limit: 10, windowMs: 60_000 },
  "coach:turn": { limit: 10, windowMs: 60_000 },
  "aiReport:onDemand": { limit: 5, windowMs: 86_400_000 },
};

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getLimits(): Record<
  RateLimitScope,
  { limit: number; windowMs: number }
> {
  const exerciseDefaults = DEFAULT_LIMITS["exercise:create"]!;
  const coachDefaults = DEFAULT_LIMITS["coach:turn"]!;
  const reportDefaults = DEFAULT_LIMITS["aiReport:onDemand"]!;

  return {
    "exercise:create": {
      limit: parseEnvInt("RATE_LIMIT_EXERCISE_PER_MIN", exerciseDefaults.limit),
      windowMs: exerciseDefaults.windowMs,
    },
    "coach:turn": {
      limit: parseEnvInt("RATE_LIMIT_COACH_PER_MIN", coachDefaults.limit),
      windowMs: coachDefaults.windowMs,
    },
    "aiReport:onDemand": {
      limit: parseEnvInt("RATE_LIMIT_REPORTS_PER_DAY", reportDefaults.limit),
      windowMs: reportDefaults.windowMs,
    },
  };
}

async function fetchWindow(
  ctx: Ctx,
  userId: string,
  scope: RateLimitScope,
  windowStartMs: number
): Promise<RateLimitRecord | null> {
  return await ctx.db
    .query("rateLimits")
    .withIndex("by_user_scope_window", (q) =>
      q
        .eq("userId", userId)
        .eq("scope", scope)
        .eq("windowStartMs", windowStartMs)
    )
    .first();
}

async function insertWindow(ctx: Ctx, record: Omit<RateLimitRecord, "_id">) {
  await ctx.db.insert("rateLimits", record);
}

async function incrementWindow(
  ctx: Ctx,
  recordId: Id<"rateLimits">
): Promise<number> {
  const current = await ctx.db.get(recordId);
  if (!current) throw new Error("Rate limit record missing during increment");
  const nextCount = (current.count ?? 0) + 1;
  await ctx.db.patch(recordId, { count: nextCount });
  return nextCount;
}

export async function assertRateLimit(
  ctx: Ctx,
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (config.exempt) {
    return { remaining: Number.POSITIVE_INFINITY, resetAt: Date.now() };
  }

  const now = Date.now();
  const windowStartMs = Math.floor(now / config.windowMs) * config.windowMs;
  const resetAt = windowStartMs + config.windowMs;

  const existing = await fetchWindow(ctx, userId, config.scope, windowStartMs);

  if (existing && existing.count >= config.limit) {
    const retryAfterMs = resetAt - now;
    const userHash = hashUserId(userId);

    console.log(
      JSON.stringify({
        level: "warn",
        msg: "rate_limit_deny",
        scope: config.scope,
        user: userHash,
        windowStartMs,
        limit: config.limit,
        count: existing.count,
        retryAfterMs,
      })
    );

    throw new RateLimitError({
      scope: config.scope,
      limit: config.limit,
      count: existing.count,
      retryAfterMs,
      resetAt,
    });
  }

  const nextCount = existing
    ? await incrementWindow(ctx, existing._id)
    : await (async () => {
        const expiresAt = windowStartMs + config.windowMs * 30;
        await insertWindow(ctx, {
          userId,
          scope: config.scope,
          windowStartMs,
          windowMs: config.windowMs,
          count: 1,
          expiresAt,
        });
        return 1;
      })();

  const userHash = hashUserId(userId);
  if (nextCount === 1) {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "rate_limit_allow_first",
        scope: config.scope,
        user: userHash,
        windowStartMs,
        limit: config.limit,
      })
    );
  }

  return {
    remaining: Math.max(config.limit - nextCount, 0),
    resetAt,
  };
}

/**
 * Optional maintenance helper to prune expired rows by `expiresAt`.
 * Call from an internal action/cron as needed.
 */
export async function pruneExpiredRateLimits(
  ctx: MutationCtx
): Promise<number> {
  const now = Date.now();
  const expired = await ctx.db
    .query("rateLimits")
    .withIndex("by_expires", (q) => q.lt("expiresAt", now))
    .collect();

  for (const row of expired) {
    await ctx.db.delete(row._id);
  }

  return expired.length;
}

/**
 * Internal mutation for rate limit enforcement from actions.
 *
 * Actions (which lack direct ctx.db access) must call this mutation
 * via ctx.runMutation() to enforce rate limits.
 *
 * @internal - Not exposed in public API; use assertRateLimit in mutations.
 */
export const checkRateLimitInternal = internalMutation({
  args: {
    userId: v.string(),
    scope: v.string(),
    limit: v.number(),
    windowMs: v.number(),
    exempt: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<RateLimitResult> => {
    return await assertRateLimit(ctx, args.userId, {
      scope: args.scope,
      limit: args.limit,
      windowMs: args.windowMs,
      exempt: args.exempt,
    });
  },
});
