/**
 * Logger Tests
 *
 * Tests for structured logger with PII redaction.
 * Note: The logger suppresses output in test environments by default,
 * so we focus on testing that functions don't throw and handle edge cases.
 */

import { describe, it, expect } from "vitest";
import { log, createChildLogger } from "./logger";

describe("logger", () => {
  describe("log methods", () => {
    it("has all log level methods", () => {
      expect(typeof log.debug).toBe("function");
      expect(typeof log.info).toBe("function");
      expect(typeof log.warn).toBe("function");
      expect(typeof log.error).toBe("function");
    });

    it("can call debug without throwing", () => {
      expect(() => log.debug("test debug")).not.toThrow();
    });

    it("can call info without throwing", () => {
      expect(() => log.info("test info")).not.toThrow();
    });

    it("can call warn without throwing", () => {
      expect(() => log.warn("test warning")).not.toThrow();
    });

    it("can call error without throwing", () => {
      expect(() => log.error("test error")).not.toThrow();
    });
  });

  describe("createChildLogger", () => {
    it("creates a logger with base context", () => {
      const childLogger = createChildLogger({ component: "test" });
      expect(typeof childLogger.debug).toBe("function");
      expect(typeof childLogger.info).toBe("function");
      expect(typeof childLogger.warn).toBe("function");
      expect(typeof childLogger.error).toBe("function");
    });

    it("child logger can log with additional context", () => {
      const childLogger = createChildLogger({ component: "auth" });
      expect(() =>
        childLogger.error("test message", { action: "login" })
      ).not.toThrow();
    });

    it("multiple child loggers are independent", () => {
      const authLogger = createChildLogger({ component: "auth" });
      const dbLogger = createChildLogger({ component: "db" });
      expect(() => {
        authLogger.info("auth event");
        dbLogger.info("db event");
      }).not.toThrow();
    });
  });

  describe("context handling", () => {
    it("handles undefined context", () => {
      expect(() => log.info("message")).not.toThrow();
    });

    it("handles empty context", () => {
      expect(() => log.info("message", {})).not.toThrow();
    });

    it("handles nested context", () => {
      expect(() =>
        log.info("message", {
          user: { id: "123", settings: { theme: "dark" } },
        })
      ).not.toThrow();
    });

    it("handles arrays in context", () => {
      expect(() =>
        log.info("message", { items: [1, 2, 3], tags: ["a", "b"] })
      ).not.toThrow();
    });

    it("handles deeply nested objects", () => {
      expect(() =>
        log.info("message", {
          level1: {
            level2: {
              level3: {
                level4: { value: "deep" },
              },
            },
          },
        })
      ).not.toThrow();
    });
  });

  describe("PII handling (emails)", () => {
    it("handles messages containing emails", () => {
      expect(() =>
        log.error("User user@example.com failed login")
      ).not.toThrow();
    });

    it("handles emails in context", () => {
      expect(() =>
        log.error("Login failed", { email: "test@domain.com" })
      ).not.toThrow();
    });

    it("handles emails in nested objects", () => {
      expect(() =>
        log.error("Event", { user: { email: "nested@test.com" } })
      ).not.toThrow();
    });

    it("handles emails in arrays", () => {
      expect(() =>
        log.error("Batch", { emails: ["one@test.com", "two@test.com"] })
      ).not.toThrow();
    });
  });

  describe("special value handling", () => {
    it("handles Error objects in context", () => {
      const error = new Error("Test error");
      expect(() => log.error("Failed", { error })).not.toThrow();
    });

    it("handles Error with custom properties", () => {
      const error = Object.assign(new Error("Test"), { code: "ERR_001" });
      expect(() => log.error("Failed", { error })).not.toThrow();
    });

    it("handles Date objects in context", () => {
      const date = new Date("2026-01-15T10:00:00Z");
      expect(() => log.info("Event", { timestamp: date })).not.toThrow();
    });

    it("handles invalid Date objects", () => {
      const invalidDate = new Date("invalid");
      expect(() => log.info("Event", { date: invalidDate })).not.toThrow();
    });

    it("handles null and undefined in context", () => {
      expect(() =>
        log.info("Message", { nullVal: null, undefinedVal: undefined })
      ).not.toThrow();
    });

    it("handles BigInt in context", () => {
      expect(() =>
        log.info("Large number", { bigNum: BigInt(9007199254740991) })
      ).not.toThrow();
    });

    it("handles circular references", () => {
      const obj: Record<string, unknown> = { name: "test" };
      obj.self = obj;
      expect(() => log.info("Circular", { data: obj })).not.toThrow();
    });

    it("handles functions in context (converted to undefined)", () => {
      expect(() => log.info("With function", { fn: () => {} })).not.toThrow();
    });

    it("handles symbols in context", () => {
      expect(() =>
        log.info("With symbol", { sym: Symbol("test") })
      ).not.toThrow();
    });

    it("handles mixed array types", () => {
      expect(() =>
        log.info("Mixed", { arr: [1, "two", { three: 3 }, null, undefined] })
      ).not.toThrow();
    });
  });

  describe("message formatting", () => {
    it("handles empty message", () => {
      expect(() => log.info("")).not.toThrow();
    });

    it("handles very long message", () => {
      const longMessage = "a".repeat(10000);
      expect(() => log.info(longMessage)).not.toThrow();
    });

    it("handles message with special characters", () => {
      expect(() => log.info("Line1\nLine2\tTabbed")).not.toThrow();
    });

    it("handles message with unicode", () => {
      expect(() => log.info("日本語 🚀 émojis")).not.toThrow();
    });
  });
});
