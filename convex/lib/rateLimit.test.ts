import { convexTest, type TestConvex } from "convex-test";
import { expect, describe, test, beforeEach, vi, afterEach } from "vitest";
import schema from "../schema";
import {
  assertRateLimit,
  getLimits,
  RateLimitError,
  pruneExpiredRateLimits,
} from "./rateLimit";

describe("rateLimit helper", () => {
  let t: TestConvex<typeof schema>;
  const user = "user_1";

  beforeEach(async () => {
    t = convexTest(schema, import.meta.glob("../**/*.ts"));
  });

  afterEach(() => {
    vi.useRealTimers();
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

  test("resets after window (new window starts fresh)", async () => {
    // Use a short window for testing (1 second)
    const shortWindowMs = 1000;
    const limit = 2;

    // Use up the limit in the first window
    await t.run(async (ctx) => {
      for (let i = 0; i < limit; i++) {
        await assertRateLimit(ctx, user, {
          scope: "test:window",
          limit,
          windowMs: shortWindowMs,
        });
      }
    });

    // Should be denied (at limit)
    await expect(async () =>
      t.run(async (ctx) =>
        assertRateLimit(ctx, user, {
          scope: "test:window",
          limit,
          windowMs: shortWindowMs,
        })
      )
    ).rejects.toBeInstanceOf(RateLimitError);

    // Advance time past the window using fake timers
    vi.useFakeTimers();
    vi.advanceTimersByTime(shortWindowMs + 100);

    // After window reset, should allow again with fresh count
    const result = await t.run(async (ctx) =>
      assertRateLimit(ctx, user, {
        scope: "test:window",
        limit,
        windowMs: shortWindowMs,
      })
    );

    expect(result.remaining).toBe(limit - 1);
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

  test("isolates users", async () => {
    const { limit, windowMs } = getLimits()["exercise:create"];
    const user2 = "user_2";

    // User 1 uses up limit
    await t.run(async (ctx) => {
      for (let i = 0; i < limit; i++) {
        await assertRateLimit(ctx, user, {
          scope: "exercise:create",
          limit,
          windowMs,
        });
      }
    });

    // User 2 should still have full limit
    const result = await t.run(async (ctx) =>
      assertRateLimit(ctx, user2, {
        scope: "exercise:create",
        limit,
        windowMs,
      })
    );

    expect(result.remaining).toBe(limit - 1);
  });
});

describe("getLimits environment variable parsing", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  test("uses fallback for invalid env var values", () => {
    // Set invalid values - use correct env var names
    process.env = {
      ...originalEnv,
      RATE_LIMIT_EXERCISE_PER_MIN: "invalid",
      RATE_LIMIT_REPORTS_PER_DAY: "-5", // Negative - should fall back
    };

    const limits = getLimits();

    // Should use default fallbacks
    expect(limits["exercise:create"].limit).toBe(10);
    expect(limits["aiReport:onDemand"].limit).toBe(5);
  });

  test("uses fallback for zero env var values", () => {
    process.env = {
      ...originalEnv,
      RATE_LIMIT_EXERCISE_PER_MIN: "0",
    };

    const limits = getLimits();

    // 0 is not > 0, so should use fallback
    expect(limits["exercise:create"].limit).toBe(10);
  });

  test("uses fallback for NaN env var values", () => {
    process.env = {
      ...originalEnv,
      RATE_LIMIT_EXERCISE_PER_MIN: "NaN",
    };

    const limits = getLimits();

    // NaN is not finite, should use fallback
    expect(limits["exercise:create"].limit).toBe(10);
  });

  test("uses fallback for Infinity env var values", () => {
    process.env = {
      ...originalEnv,
      RATE_LIMIT_EXERCISE_PER_MIN: "Infinity",
    };

    const limits = getLimits();

    // Infinity is not finite per Number.isFinite(), should use fallback
    expect(limits["exercise:create"].limit).toBe(10);
  });

  test("uses valid env var values when provided", () => {
    process.env = {
      ...originalEnv,
      RATE_LIMIT_EXERCISE_PER_MIN: "20",
      RATE_LIMIT_REPORTS_PER_DAY: "10",
    };

    const limits = getLimits();

    // Should use custom values
    expect(limits["exercise:create"].limit).toBe(20);
    expect(limits["aiReport:onDemand"].limit).toBe(10);
  });
});
