// @vitest-environment node

import { describe, expect, it } from "vitest";
import { sanitizeError } from "./sanitize-error";

describe("sanitizeError", () => {
  it("passes through short validation errors", () => {
    expect(sanitizeError("Reps must be a positive number")).toBe(
      "Reps must be a positive number"
    );
  });

  it("falls back on empty/undefined input", () => {
    expect(sanitizeError("")).toBe("Something went wrong. Please try again.");
    expect(sanitizeError(undefined)).toBe(
      "Something went wrong. Please try again."
    );
    expect(sanitizeError(null)).toBe("Something went wrong. Please try again.");
  });

  it("strips Convex function prefixes", () => {
    expect(
      sanitizeError(
        "[CONVEX M(sets:logSet)] Uncaught Error: exercise not found"
      )
    ).toBe("Uncaught Error: exercise not found");
  });

  it("strips file paths with line numbers", () => {
    expect(sanitizeError("Error at convex/sets.ts:45:12 something broke")).toBe(
      "Error at  something broke"
    );
  });

  it("strips stack traces", () => {
    const withStack =
      "Error: bad thing\n  at Object.handler (convex/sets.ts:45:12)\n  at async run (node_modules/.fn/runtime.js:10:3)";
    const result = sanitizeError(withStack);
    expect(result).not.toContain("at Object.handler");
    expect(result).not.toContain("node_modules");
    expect(result).toContain("bad thing");
  });

  it("returns generic fallback when only paths/traces remain", () => {
    expect(
      sanitizeError("  at convex/sets.ts:1:1\n  at convex/foo.ts:2:3")
    ).toBe("Something went wrong. Please try again.");
  });

  it("handles src/ paths", () => {
    expect(
      sanitizeError("Failed in src/lib/coach/tools/tool-log-set.ts:136")
    ).toBe("Failed in");
  });
});
