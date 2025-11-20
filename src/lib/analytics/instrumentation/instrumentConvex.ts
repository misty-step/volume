import {
  MutationCtx,
  ActionCtx,
  internalAction,
  internalMutation,
} from "../../../../convex/_generated/server";
import { internal } from "../../../../convex/_generated/api";
import { AnalyticsEventName, AnalyticsEventProperties } from "../events";

/**
 * Type definition for a Convex mutation handler.
 */
type MutationHandler<Args, Return> = (
  ctx: MutationCtx,
  args: Args
) => Promise<Return>;

/**
 * Instrument a Convex mutation with analytics tracking.
 *
 * Wraps the mutation to automatically schedule an analytics tracking action
 * on success or failure.
 *
 * @param handler - The original mutation handler
 * @param options - Configuration for success/failure events
 * @returns Wrapped mutation handler
 *
 * @example
 * export const myMutation = mutation({
 *   args: { ... },
 *   handler: instrumentConvexMutation(async (ctx, args) => {
 *     // ... mutation logic
 *   }, {
 *     eventsOnSuccess: (args, result) => [{ name: "My Event", props: { ... } }]
 *   })
 * });
 */
export function instrumentConvexMutation<Args, Return>(
  handler: MutationHandler<Args, Return>,
  options: {
    eventsOnSuccess?: (
      args: Args,
      result: Return
    ) => { name: AnalyticsEventName; props?: any }[];
    eventsOnFailure?: (
      args: Args,
      error: any
    ) => { name: AnalyticsEventName; props?: any }[];
  }
) {
  return async (ctx: MutationCtx, args: Args): Promise<Return> => {
    try {
      // Execute the original mutation
      const result = await handler(ctx, args);

      // Track success events
      if (options.eventsOnSuccess) {
        const events = options.eventsOnSuccess(args, result);
        for (const event of events) {
          await ctx.scheduler.runAfter(0, internal.analytics.track, {
            name: event.name,
            properties: event.props || {},
          });
        }
      }

      return result;
    } catch (error) {
      // Track failure events
      if (options.eventsOnFailure) {
        try {
          const events = options.eventsOnFailure(args, error);
          for (const event of events) {
            await ctx.scheduler.runAfter(0, internal.analytics.track, {
              name: event.name,
              properties: event.props || {},
            });
          }
        } catch (trackingError) {
          // Fail safe: don't let tracking errors mask the original error
          console.error(
            "Failed to track error event in Convex mutation:",
            trackingError
          );
        }
      }

      // Re-throw the original error
      throw error;
    }
  };
}
