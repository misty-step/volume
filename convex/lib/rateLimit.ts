import crypto from "crypto";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

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

type Ctx = MutationCtx | QueryCtx;

type RateLimitRecord = {
  _id: Id<"rateLimits">;
  userId: string;
  scope: RateLimitScope;
  windowStartMs: number;
  windowMs: number;
  count: number;
  expiresAt: number;
};

/** Hash userId for logging without exposing PII */
function hashUserId(userId: string): string {
  return crypto.createHash("sha256").update(userId).digest("hex").slice(0, 8);
}

const DEFAULT_LIMITS: Record<
  RateLimitScope,
  { limit: number; windowMs: number }
> = {
  "exercise:create": { limit: 10, windowMs: 60_000 },
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
  return {
    "exercise:create": {
      limit: parseEnvInt(
        "RATE_LIMIT_EXERCISE_PER_MIN",
        DEFAULT_LIMITS["exercise:create"].limit
      ),
      windowMs: DEFAULT_LIMITS["exercise:create"].windowMs,
    },
    "aiReport:onDemand": {
      limit: parseEnvInt(
        "RATE_LIMIT_REPORTS_PER_DAY",
        DEFAULT_LIMITS["aiReport:onDemand"].limit
      ),
      windowMs: DEFAULT_LIMITS["aiReport:onDemand"].windowMs,
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
