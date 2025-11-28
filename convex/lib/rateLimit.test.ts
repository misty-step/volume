import { convexTest } from "convex-test";
import { expect, describe, test, beforeEach } from "vitest";
import schema from "../schema";
import {
  assertRateLimit,
  getLimits,
  RateLimitError,
  pruneExpiredRateLimits,
} from "./rateLimit";

// Minimal ctx type inference from convex-test

describe("rateLimit helper", () => {
  let t: ReturnType<typeof convexTest<typeof schema>>;
  const user = "user_1";

  beforeEach(async () => {
    t = convexTest(schema, {});
  });

  test("allows within limit and returns remaining", async () => {
    const limits = getLimits();
    const { limit, windowMs } = limits["exercise:create"];

    const result = await t.run(async (ctx) =>
      assertRateLimit(ctx, user, { scope: "exercise:create", limit, windowMs })
    );

    expect(result.remaining).toBe(limit - 1);
  });

  test("denies when over limit", async () => {
    const { limit, windowMs } = getLimits()["aiReport:onDemand"];

    await t.run(async (ctx) => {
      for (let i = 0; i < limit; i++) {
        await assertRateLimit(ctx, user, {
          scope: "aiReport:onDemand",
          limit,
          windowMs,
        });
      }
    });

    await expect(async () =>
      t.run(async (ctx) =>
        assertRateLimit(ctx, user, {
          scope: "aiReport:onDemand",
          limit,
          windowMs,
        })
      )
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  test("resets after window", async () => {
    const { limit, windowMs } = getLimits()["exercise:create"];
    await t.run(async (ctx) => {
      for (let i = 0; i < limit; i++) {
        await assertRateLimit(ctx, user, {
          scope: "exercise:create",
          limit,
          windowMs,
        });
      }
    });

    // Advance clock by moving windowStart via direct insert into a later window
    await t.run(async (ctx) => {
      await ctx.db.insert("rateLimits", {
        userId: user,
        scope: "exercise:create",
        windowStartMs: Date.now() + windowMs,
        windowMs,
        count: 0,
        expiresAt: Date.now() + windowMs * 2,
      });
    });

    const result = await t.run(async (ctx) =>
      assertRateLimit(ctx, user, { scope: "exercise:create", limit, windowMs })
    );

    expect(result.remaining).toBeLessThanOrEqual(limit - 1);
  });

  test("exempt skips counting", async () => {
    const { limit, windowMs } = getLimits()["exercise:create"];

    const first = await t.run(async (ctx) =>
      assertRateLimit(ctx, user, {
        scope: "exercise:create",
        limit,
        windowMs,
        exempt: true,
      })
    );

    expect(first.remaining).toBe(Number.POSITIVE_INFINITY);
  });

  test("pruneExpired removes old rows", async () => {
    const { limit, windowMs } = getLimits()["exercise:create"];
    await t.run(async (ctx) => {
      await ctx.db.insert("rateLimits", {
        userId: user,
        scope: "exercise:create",
        windowStartMs: 0,
        windowMs,
        count: limit,
        expiresAt: 1,
      });
    });

    const deleted = await t.run((ctx) => pruneExpiredRateLimits(ctx));
    expect(deleted).toBe(1);
  });
});
