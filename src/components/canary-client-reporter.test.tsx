import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanaryClientReporter } from "./canary-client-reporter";

const analyticsMocks = vi.hoisted(() => ({
  reportError: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  reportError: (...args: unknown[]) => analyticsMocks.reportError(...args),
}));

describe("CanaryClientReporter", () => {
  afterEach(() => {
    analyticsMocks.reportError.mockReset();
  });

  it("reports uncaught browser errors to Canary", () => {
    const error = new Error("render exploded");
    render(<CanaryClientReporter />);

    window.dispatchEvent(
      new ErrorEvent("error", {
        error,
        message: "render exploded",
        filename: "app.js",
        lineno: 12,
        colno: 4,
      })
    );

    expect(analyticsMocks.reportError).toHaveBeenCalledWith(error, {
      boundary: "window.error",
      source: "app.js",
      lineno: 12,
      colno: 4,
    });
  });

  it("reports unhandled promise rejections to Canary", () => {
    render(<CanaryClientReporter />);
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: "async exploded",
    });

    window.dispatchEvent(event);

    expect(analyticsMocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "async exploded" }),
      { boundary: "window.unhandledrejection" }
    );
  });

  it("removes browser error listeners on unmount", () => {
    const addListener = vi.spyOn(window, "addEventListener");
    const removeListener = vi.spyOn(window, "removeEventListener");

    try {
      const { unmount } = render(<CanaryClientReporter />);
      const errorHandler = addListener.mock.calls.find(
        ([type]) => type === "error"
      )?.[1];
      const rejectionHandler = addListener.mock.calls.find(
        ([type]) => type === "unhandledrejection"
      )?.[1];

      unmount();

      expect(removeListener).toHaveBeenCalledWith("error", errorHandler);
      expect(removeListener).toHaveBeenCalledWith(
        "unhandledrejection",
        rejectionHandler
      );
    } finally {
      addListener.mockRestore();
      removeListener.mockRestore();
    }
  });
});
