/**
 * Utility Functions Tests
 *
 * Tests for cn (class name merger) and isMobile detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cn, isMobile } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const result = cn("base", true && "active", false && "hidden");
    expect(result).toBe("base active");
  });

  it("handles arrays", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toBe("foo bar");
  });

  it("handles objects", () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toBe("foo baz");
  });

  it("merges tailwind classes correctly", () => {
    // twMerge should dedupe conflicting classes
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("handles undefined and null", () => {
    const result = cn("base", undefined, null, "end");
    expect(result).toBe("base end");
  });

  it("returns empty string for no inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });
});

describe("isMobile", () => {
  const originalWindow = global.window;

  afterEach(() => {
    // Restore original window
    if (originalWindow === undefined) {
      // @ts-expect-error - intentionally deleting window for test cleanup
      delete global.window;
    } else {
      global.window = originalWindow;
    }
  });

  it("returns false when window is undefined", () => {
    // @ts-expect-error - intentionally deleting window for test
    delete global.window;
    expect(isMobile()).toBe(false);
  });

  it("returns true when viewport width is less than 768", () => {
    global.window = { innerWidth: 767 } as Window & typeof globalThis;
    expect(isMobile()).toBe(true);
  });

  it("returns false when viewport width is 768 or more", () => {
    global.window = { innerWidth: 768 } as Window & typeof globalThis;
    expect(isMobile()).toBe(false);
  });

  it("returns false for desktop viewport", () => {
    global.window = { innerWidth: 1024 } as Window & typeof globalThis;
    expect(isMobile()).toBe(false);
  });

  it("returns true for small mobile viewport", () => {
    global.window = { innerWidth: 375 } as Window & typeof globalThis;
    expect(isMobile()).toBe(true);
  });
});
