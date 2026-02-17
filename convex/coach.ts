import { mutation } from "./_generated/server";
import { requireAuth } from "./lib/validate";
import { assertRateLimit, getLimits, RateLimitError } from "./lib/rateLimit";

export const checkCoachTurnRateLimit = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);

    const limits = getLimits();
    const coachLimit = limits["coach:turn"];
    if (!coachLimit) {
      throw new Error("Rate limit configuration missing for coach:turn");
    }

    try {
      const result = await assertRateLimit(ctx, identity.subject, {
        scope: "coach:turn",
        limit: coachLimit.limit,
        windowMs: coachLimit.windowMs,
      });
      return { ok: true as const, limit: coachLimit.limit, ...result };
    } catch (error) {
      if (error instanceof RateLimitError) {
        return {
          ok: false as const,
          limit: error.limit,
          remaining: 0,
          resetAt: error.resetAt,
          retryAfterMs: error.retryAfterMs,
        };
      }
      throw error;
    }
  },
});
