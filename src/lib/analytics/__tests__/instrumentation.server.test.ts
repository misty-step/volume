import { describe, it, expect, vi } from "vitest";
import { instrumentConvexMutation } from "../instrumentation/instrumentConvex";

describe("instrumentConvexMutation", () => {
  it("should execute original mutation", async () => {
    const handler = vi.fn().mockResolvedValue("result");
    const ctx = { scheduler: { runAfter: vi.fn() } } as any;
    const args = { id: "1" };

    const wrapped = instrumentConvexMutation(handler, {});
    const result = await wrapped(ctx, args);

    expect(result).toBe("result");
    expect(handler).toHaveBeenCalledWith(ctx, args);
  });

  it("should schedule success events", async () => {
    const handler = vi.fn().mockResolvedValue("result_id");
    const scheduler = { runAfter: vi.fn() };
    const ctx = { scheduler } as any;
    const args = { name: "test" };

    const wrapped = instrumentConvexMutation(handler, {
      eventsOnSuccess: (a, r) => [
        { name: "Exercise Created", props: { id: r, name: a.name } } as any,
      ],
    });

    await wrapped(ctx, args);

    expect(scheduler.runAfter).toHaveBeenCalled();
    const [delay, action, payload] = scheduler.runAfter.mock.calls[0];
    expect(delay).toBe(0);
    // We can't check strict equality of action function (internal.analytics.track) without mocking internal
    expect(payload).toEqual({
      name: "Exercise Created",
      properties: { id: "result_id", name: "test" },
    });
  });

  it("should schedule failure events", async () => {
    const error = new Error("Validation failed");
    const handler = vi.fn().mockRejectedValue(error);
    const scheduler = { runAfter: vi.fn() };
    const ctx = { scheduler } as any;
    const args = { name: "test" };

    const wrapped = instrumentConvexMutation(handler, {
      eventsOnFailure: (a, e) => [
        { name: "Exercise Created", props: { error: e.message } } as any,
      ],
    });

    await expect(wrapped(ctx, args)).rejects.toThrow("Validation failed");

    expect(scheduler.runAfter).toHaveBeenCalled();
    const [delay, action, payload] = scheduler.runAfter.mock.calls[0];
    expect(payload).toEqual({
      name: "Exercise Created",
      properties: { error: "Validation failed" },
    });
  });

  it("should swallow tracking errors", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Original Error"));
    const scheduler = {
      runAfter: vi.fn().mockImplementation(() => {
        throw new Error("Tracking Error");
      }),
    };
    const ctx = { scheduler } as any;

    const wrapped = instrumentConvexMutation(handler, {
      eventsOnFailure: () => [{ name: "Exercise Created" } as any],
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Should reject with original error, not tracking error
    await expect(wrapped(ctx, {})).rejects.toThrow("Original Error");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to track error event in Convex mutation:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
