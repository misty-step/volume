import { describe, it, expect, vi } from "vitest";
import { sanitizeProperties, sanitizeString } from "../sanitizer";

describe("SanitizationEngine", () => {
  describe("sanitizeString", () => {
    it("should redact emails", () => {
      expect(sanitizeString("Contact me at user@example.com")).toBe(
        "Contact me at [EMAIL_REDACTED]"
      );
    });

    it("should be idempotent", () => {
      expect(sanitizeString("Already [EMAIL_REDACTED] here")).toBe(
        "Already [EMAIL_REDACTED] here"
      );
    });

    it("should handle multiple emails", () => {
      expect(sanitizeString("a@b.com and c@d.org")).toBe(
        "[EMAIL_REDACTED] and [EMAIL_REDACTED]"
      );
    });
  });

  describe("sanitizeProperties", () => {
    it("should pass through primitives", () => {
      const input = { count: 42, isActive: true, name: "test" };
      const output = sanitizeProperties(input);
      expect(output).toEqual(input);
    });

    it("should stringify nested objects with redaction", () => {
      const input = {
        user: {
          email: "user@example.com",
          profile: { bio: "Contact: me@work.com" },
        },
      };
      const output = sanitizeProperties(input);
      const parsedUser = JSON.parse(output.user as string);

      expect(parsedUser.email).toBe("[EMAIL_REDACTED]");
      expect(parsedUser.profile.bio).toBe("Contact: [EMAIL_REDACTED]");
    });

    it("should handle arrays", () => {
      const input = { tags: ["admin", "user@test.com", 123] };
      const output = sanitizeProperties(input);
      // JSON.stringify of array with redacted string
      expect(output.tags).toBe('["admin","[EMAIL_REDACTED]",123]');
    });

    it("should handle circular references to root", () => {
      const obj: any = { name: "root" };
      obj.self = obj;

      const output = sanitizeProperties(obj);
      expect(output.name).toBe("root");
      // Expect literal [Circular] because it's detected in the outer loop
      expect(output.self).toBe("[Circular]");
    });

    it("should handle circular references inside nested objects", () => {
      const obj: any = { name: "root" };
      // obj -> child -> parent (obj)
      obj.child = { parent: obj };

      const output = sanitizeProperties(obj);
      // The nested circular ref is caught by replacer, which returns "[Circular]" string.
      // JSON.stringify quotes it.

      const parsedChild = JSON.parse(output.child as string);
      expect(parsedChild.parent).toBe("[Circular]");
    });

    it("should guard against large payloads", () => {
      const largeString = "a".repeat(5000);
      const input = { data: largeString };

      // Mock console.warn to suppress expected noise
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const output = sanitizeProperties(input);
      expect(output).toEqual({ droppedReason: "payload_too_large" });

      consoleSpy.mockRestore();
    });

    it("should handle invalid UTF-8 sequences", () => {
      // Construct a lone surrogate which is invalid UTF-8/16 usage
      const invalid = "\uD800";
      const input = { text: `Bad ${invalid} char` };

      const output = sanitizeProperties(input);
      // toWellFormed or TextDecoder should replace it with replacement char
      expect(output.text).not.toContain("\uD800");
      expect((output.text as string).length).toBeGreaterThan(5);
    });

    it("should handle unsupported types", () => {
      const input = {
        func: () => {},
        sym: Symbol("test"),
      };

      const output = sanitizeProperties(input);
      // Top level unsupported types are converted to String()
      expect(typeof output.func).toBe("string");
      expect(typeof output.sym).toBe("string");

      // Nested unsupported types
      const nested = {
        meta: {
          fn: () => {},
          s: Symbol("nested"),
        },
      };
      const nestedOutput = sanitizeProperties(nested);
      const parsedMeta = JSON.parse(nestedOutput.meta as string);
      expect(parsedMeta.fn).toBe("[Unsupported:function]");
      expect(parsedMeta.s).toBe("[Unsupported:symbol]");
    });
  });
});
