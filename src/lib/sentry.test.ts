/**
 * Tests for Sentry PII sanitization and configuration.
 *
 * Critical compliance code: ensures emails, sensitive headers, and PII
 * are properly redacted before transmission to Sentry.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Breadcrumb, Event } from "@sentry/nextjs";
import {
  sanitizeEvent,
  sanitizeBreadcrumb,
  shouldEnableSentry,
  createSentryOptions,
} from "./sentry";

describe("sentry", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("sanitizeEvent", () => {
    describe("email redaction", () => {
      it("redacts simple email in message", () => {
        const event: Event = {
          message: "Error for user@example.com",
        };

        const result = sanitizeEvent(event);

        expect(result?.message).toBe("Error for [EMAIL_REDACTED]");
      });

      it("redacts complex email formats", () => {
        const event: Event = {
          message: "user.name+tag@example.co.uk failed",
        };

        const result = sanitizeEvent(event);

        expect(result?.message).toBe("[EMAIL_REDACTED] failed");
      });

      it("redacts multiple emails in same string", () => {
        const event: Event = {
          message: "From: sender@test.com To: receiver@test.org",
        };

        const result = sanitizeEvent(event);

        expect(result?.message).toBe(
          "From: [EMAIL_REDACTED] To: [EMAIL_REDACTED]"
        );
      });

      it("does not double-redact already redacted emails", () => {
        const event: Event = {
          message: "Already [EMAIL_REDACTED] here",
        };

        const result = sanitizeEvent(event);

        expect(result?.message).toBe("Already [EMAIL_REDACTED] here");
      });

      it("handles string with no emails", () => {
        const event: Event = {
          message: "No email addresses here",
        };

        const result = sanitizeEvent(event);

        expect(result?.message).toBe("No email addresses here");
      });

      it("redacts emails in logentry message", () => {
        const event: Event = {
          logentry: {
            message: "Log for user@test.com",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.logentry?.message).toBe("Log for [EMAIL_REDACTED]");
      });
    });

    describe("user data sanitization", () => {
      it("redacts user email", () => {
        const event: Event = {
          user: {
            id: "123",
            email: "user@example.com",
            username: "testuser",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.user?.email).toBe("[EMAIL_REDACTED]");
        expect(result?.user?.id).toBe("123");
        expect(result?.user?.username).toBe("testuser");
      });

      it("removes user IP address", () => {
        const event: Event = {
          user: {
            id: "123",
            ip_address: "192.168.1.1",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.user?.ip_address).toBeUndefined();
        expect(result?.user?.id).toBe("123");
      });

      it("handles user without email or IP", () => {
        const event: Event = {
          user: {
            id: "123",
            username: "testuser",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.user?.id).toBe("123");
        expect(result?.user?.username).toBe("testuser");
      });
    });

    describe("request data sanitization", () => {
      it("removes authorization header", () => {
        const event: Event = {
          request: {
            headers: {
              authorization: "Bearer token123",
              "content-type": "application/json",
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.headers?.authorization).toBeUndefined();
        expect(result?.request?.headers?.["content-type"]).toBe(
          "application/json"
        );
      });

      it("removes cookie header", () => {
        const event: Event = {
          request: {
            headers: {
              cookie: "session=abc123",
              accept: "text/html",
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.headers?.cookie).toBeUndefined();
        expect(result?.request?.headers?.accept).toBe("text/html");
      });

      it("removes set-cookie header", () => {
        const event: Event = {
          request: {
            headers: {
              "set-cookie": "session=xyz",
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.headers?.["set-cookie"]).toBeUndefined();
      });

      it("removes x-api-key header", () => {
        const event: Event = {
          request: {
            headers: {
              "x-api-key": "secret-key",
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.headers?.["x-api-key"]).toBeUndefined();
      });

      it("handles case-insensitive header matching", () => {
        const event: Event = {
          request: {
            headers: {
              Authorization: "Bearer token",
              COOKIE: "session=123",
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.headers?.Authorization).toBeUndefined();
        expect(result?.request?.headers?.COOKIE).toBeUndefined();
      });

      it("sanitizes emails in header values", () => {
        const event: Event = {
          request: {
            headers: {
              "x-user-email": "user@test.com",
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.headers?.["x-user-email"]).toBe(
          "[EMAIL_REDACTED]"
        );
      });

      it("sanitizes array header values", () => {
        const event: Event = {
          request: {
            headers: {
              "x-emails": ["one@test.com", "two@test.com"] as unknown as string,
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.headers?.["x-emails"]).toEqual([
          "[EMAIL_REDACTED]",
          "[EMAIL_REDACTED]",
        ]);
      });

      it("preserves non-string items in array header values", () => {
        const event: Event = {
          request: {
            headers: {
              "x-mixed": ["user@test.com", 123, null] as unknown as string,
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.headers?.["x-mixed"]).toEqual([
          "[EMAIL_REDACTED]",
          123,
          null,
        ]);
      });

      it("sanitizes query string", () => {
        const event: Event = {
          request: {
            query_string: "email=user@test.com&name=John",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.query_string).toBe(
          "email=[EMAIL_REDACTED]&name=John"
        );
      });

      it("sanitizes request data object", () => {
        const event: Event = {
          request: {
            data: {
              email: "user@test.com",
              name: "John",
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.data).toEqual({
          email: "[EMAIL_REDACTED]",
          name: "John",
        });
      });

      it("sanitizes request cookies", () => {
        const event: Event = {
          request: {
            cookies: {
              user_email: "user@test.com",
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.cookies?.user_email).toBe("[EMAIL_REDACTED]");
      });

      it("sanitizes request URL", () => {
        const event: Event = {
          request: {
            url: "https://example.com/users/user@test.com/profile",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.url).toBe(
          "https://example.com/users/[EMAIL_REDACTED]/profile"
        );
      });

      it("handles undefined headers", () => {
        const event: Event = {
          request: {
            method: "GET",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.request?.method).toBe("GET");
        expect(result?.request?.headers).toBeUndefined();
      });
    });

    describe("exception sanitization", () => {
      it("sanitizes exception value", () => {
        const event: Event = {
          exception: {
            values: [
              {
                type: "Error",
                value: "Failed for user@test.com",
              },
            ],
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.exception?.values?.[0]?.value).toBe(
          "Failed for [EMAIL_REDACTED]"
        );
      });

      it("sanitizes stack frame vars", () => {
        const event: Event = {
          exception: {
            values: [
              {
                type: "Error",
                value: "Error",
                stacktrace: {
                  frames: [
                    {
                      filename: "app.js",
                      vars: {
                        userEmail: "user@test.com",
                        count: 42,
                      },
                    },
                  ],
                },
              },
            ],
          },
        };

        const result = sanitizeEvent(event);

        const vars =
          result?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.vars;
        expect(vars?.userEmail).toBe("[EMAIL_REDACTED]");
        expect(vars?.count).toBe(42);
      });

      it("handles multiple exceptions", () => {
        const event: Event = {
          exception: {
            values: [
              { type: "Error", value: "first@test.com" },
              { type: "TypeError", value: "second@test.com" },
            ],
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.exception?.values?.[0]?.value).toBe("[EMAIL_REDACTED]");
        expect(result?.exception?.values?.[1]?.value).toBe("[EMAIL_REDACTED]");
      });
    });

    describe("context and extra sanitization", () => {
      it("sanitizes contexts", () => {
        const event: Event = {
          contexts: {
            user: {
              email: "user@test.com",
            },
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.contexts?.user?.email).toBe("[EMAIL_REDACTED]");
      });

      it("sanitizes extra data", () => {
        const event: Event = {
          extra: {
            userEmail: "user@test.com",
            debug: "some info",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.extra?.userEmail).toBe("[EMAIL_REDACTED]");
        expect(result?.extra?.debug).toBe("some info");
      });

      it("sanitizes tags", () => {
        const event: Event = {
          tags: {
            email: "user@test.com",
            version: "1.0.0",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.tags?.email).toBe("[EMAIL_REDACTED]");
        expect(result?.tags?.version).toBe("1.0.0");
      });

      it("handles nested objects in extra", () => {
        const event: Event = {
          extra: {
            user: {
              profile: {
                email: "user@test.com",
              },
            },
          },
        };

        const result = sanitizeEvent(event);

        const profile = result?.extra?.user as { profile: { email: string } };
        expect(profile.profile.email).toBe("[EMAIL_REDACTED]");
      });

      it("handles arrays in extra", () => {
        const event: Event = {
          extra: {
            emails: ["one@test.com", "two@test.com"],
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.extra?.emails).toEqual([
          "[EMAIL_REDACTED]",
          "[EMAIL_REDACTED]",
        ]);
      });
    });

    describe("circular reference handling", () => {
      it("handles circular references without infinite loop", () => {
        const circular: Record<string, unknown> = {
          email: "user@test.com",
        };
        circular.self = circular;

        const event: Event = {
          extra: circular,
        };

        // Should not throw and should complete
        const result = sanitizeEvent(event);

        expect(result?.extra?.email).toBe("[EMAIL_REDACTED]");
        // Circular reference preserved
        expect(result?.extra?.self).toBe(result?.extra);
      });

      it("handles multiple references to same object", () => {
        const shared = { email: "user@test.com" };
        const event: Event = {
          extra: {
            first: shared,
            second: shared,
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.extra?.first).toBe(result?.extra?.second);
      });
    });

    describe("edge cases", () => {
      it("returns event unchanged when no PII present", () => {
        const event: Event = {
          message: "Simple error",
          tags: { version: "1.0.0" },
        };

        const result = sanitizeEvent(event);

        expect(result?.message).toBe("Simple error");
        expect(result?.tags?.version).toBe("1.0.0");
      });

      it("handles empty event", () => {
        const event: Event = {};

        const result = sanitizeEvent(event);

        expect(result).toEqual({});
      });

      it("preserves non-string message types", () => {
        const event: Event = {
          message: undefined,
        };

        const result = sanitizeEvent(event);

        expect(result?.message).toBeUndefined();
      });

      it("handles null values in data", () => {
        const event: Event = {
          extra: {
            value: null,
            email: "user@test.com",
          },
        };

        const result = sanitizeEvent(event);

        expect(result?.extra?.value).toBeNull();
        expect(result?.extra?.email).toBe("[EMAIL_REDACTED]");
      });
    });
  });

  describe("sanitizeBreadcrumb", () => {
    it("sanitizes breadcrumb message", () => {
      const breadcrumb: Breadcrumb = {
        message: "User user@test.com logged in",
        category: "auth",
      };

      const result = sanitizeBreadcrumb(breadcrumb);

      expect(result?.message).toBe("User [EMAIL_REDACTED] logged in");
      expect(result?.category).toBe("auth");
    });

    it("sanitizes breadcrumb data", () => {
      const breadcrumb: Breadcrumb = {
        category: "xhr",
        data: {
          url: "https://api.example.com",
          email: "user@test.com",
        },
      };

      const result = sanitizeBreadcrumb(breadcrumb);

      expect(result?.data?.email).toBe("[EMAIL_REDACTED]");
      expect(result?.data?.url).toBe("https://api.example.com");
    });

    it("handles breadcrumb without message or data", () => {
      const breadcrumb: Breadcrumb = {
        category: "console",
        level: "info",
      };

      const result = sanitizeBreadcrumb(breadcrumb);

      expect(result?.category).toBe("console");
      expect(result?.level).toBe("info");
    });

    it("handles nested data in breadcrumb", () => {
      const breadcrumb: Breadcrumb = {
        data: {
          user: {
            email: "user@test.com",
          },
        },
      };

      const result = sanitizeBreadcrumb(breadcrumb);

      const user = result?.data?.user as { email: string };
      expect(user.email).toBe("[EMAIL_REDACTED]");
    });

    it("returns null for null input", () => {
      const result = sanitizeBreadcrumb(null as unknown as Breadcrumb);

      expect(result).toBeNull();
    });
  });

  describe("shouldEnableSentry", () => {
    it("returns false when DSN is undefined", () => {
      const result = shouldEnableSentry(undefined);

      expect(result).toBe(false);
    });

    it("returns false when DSN is empty string", () => {
      const result = shouldEnableSentry("");

      expect(result).toBe(false);
    });

    it("returns false in test environment", () => {
      vi.stubEnv("NODE_ENV", "test");

      const result = shouldEnableSentry("https://key@sentry.io/123");

      expect(result).toBe(false);
    });

    it("returns false when disable flag is set", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_DISABLE_SENTRY", "true");

      const result = shouldEnableSentry("https://key@sentry.io/123");

      expect(result).toBe(false);
    });

    it("returns true in production with DSN", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_DISABLE_SENTRY", "false");

      const result = shouldEnableSentry("https://key@sentry.io/123");

      expect(result).toBe(true);
    });

    it("returns true in development with DSN", () => {
      vi.stubEnv("NODE_ENV", "development");

      const result = shouldEnableSentry("https://key@sentry.io/123");

      expect(result).toBe(true);
    });
  });

  describe("createSentryOptions", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("SENTRY_DSN", "https://key@sentry.io/123");
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@sentry.io/456");
    });

    describe("DSN resolution", () => {
      it("client prefers NEXT_PUBLIC_SENTRY_DSN", () => {
        const options = createSentryOptions("client");

        expect(options.dsn).toBe("https://public@sentry.io/456");
      });

      it("client falls back to SENTRY_DSN", () => {
        vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");

        const options = createSentryOptions("client");

        expect(options.dsn).toBe("https://key@sentry.io/123");
      });

      it("server prefers SENTRY_DSN", () => {
        const options = createSentryOptions("server");

        expect(options.dsn).toBe("https://key@sentry.io/123");
      });

      it("server falls back to NEXT_PUBLIC_SENTRY_DSN", () => {
        vi.stubEnv("SENTRY_DSN", "");

        const options = createSentryOptions("server");

        expect(options.dsn).toBe("https://public@sentry.io/456");
      });

      it("edge prefers SENTRY_DSN", () => {
        const options = createSentryOptions("edge");

        expect(options.dsn).toBe("https://key@sentry.io/123");
      });
    });

    describe("environment resolution", () => {
      it("uses SENTRY_ENVIRONMENT when set", () => {
        vi.stubEnv("SENTRY_ENVIRONMENT", "staging");

        const options = createSentryOptions("client");

        expect(options.environment).toBe("staging");
      });

      it("uses Vercel environment detection", () => {
        vi.stubEnv("VERCEL_ENV", "production");

        const options = createSentryOptions("client");

        expect(options.environment).toBe("production");
      });

      it("uses NEXT_PUBLIC_VERCEL_ENV as fallback", () => {
        vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");

        const options = createSentryOptions("client");

        expect(options.environment).toBe("preview");
      });

      it("defaults to development when no env vars set", () => {
        vi.stubEnv("NODE_ENV", "development");

        const options = createSentryOptions("client");

        expect(options.environment).toBe("development");
      });
    });

    describe("release resolution", () => {
      it("uses SENTRY_RELEASE when set", () => {
        vi.stubEnv("SENTRY_RELEASE", "v1.2.3");

        const options = createSentryOptions("client");

        expect(options.release).toBe("v1.2.3");
      });

      it("falls back to VERCEL_GIT_COMMIT_SHA", () => {
        vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123");

        const options = createSentryOptions("client");

        expect(options.release).toBe("abc123");
      });

      it("falls back to NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", () => {
        vi.stubEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", "def456");

        const options = createSentryOptions("client");

        expect(options.release).toBe("def456");
      });

      it("falls back to npm_package_version", () => {
        vi.stubEnv("npm_package_version", "1.0.0");

        const options = createSentryOptions("client");

        expect(options.release).toBe("1.0.0");
      });
    });

    describe("sample rate configuration", () => {
      it("uses default traces sample rate", () => {
        const options = createSentryOptions("client");

        expect(options.tracesSampleRate).toBe(0.1);
      });

      it("parses custom traces sample rate", () => {
        vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "0.5");

        const options = createSentryOptions("client");

        expect(options.tracesSampleRate).toBe(0.5);
      });

      it("clamps sample rate to maximum 1.0", () => {
        vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "2.0");

        const options = createSentryOptions("client");

        expect(options.tracesSampleRate).toBe(1.0);
      });

      it("clamps sample rate to minimum 0.0", () => {
        vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "-0.5");

        const options = createSentryOptions("client");

        expect(options.tracesSampleRate).toBe(0.0);
      });

      it("uses default for invalid sample rate", () => {
        vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "invalid");

        const options = createSentryOptions("client");

        expect(options.tracesSampleRate).toBe(0.1);
      });
    });

    describe("client-specific options", () => {
      it("includes replay sample rates for client", () => {
        const options = createSentryOptions("client");

        expect(options.replaysSessionSampleRate).toBe(0.05);
        expect(options.replaysOnErrorSampleRate).toBe(1.0);
      });

      it("parses custom replay sample rates", () => {
        vi.stubEnv("SENTRY_REPLAYS_SESSION_SAMPLE_RATE", "0.2");
        vi.stubEnv("SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE", "0.8");

        const options = createSentryOptions("client");

        expect(options.replaysSessionSampleRate).toBe(0.2);
        expect(options.replaysOnErrorSampleRate).toBe(0.8);
      });

      it("does not include replay rates for server", () => {
        const options = createSentryOptions("server");

        expect(options.replaysSessionSampleRate).toBeUndefined();
        expect(options.replaysOnErrorSampleRate).toBeUndefined();
      });

      it("does not include replay rates for edge", () => {
        const options = createSentryOptions("edge");

        expect(options.replaysSessionSampleRate).toBeUndefined();
        expect(options.replaysOnErrorSampleRate).toBeUndefined();
      });
    });

    describe("disabled state", () => {
      it("sets all sample rates to 0 when disabled", () => {
        vi.stubEnv("NODE_ENV", "test");

        const options = createSentryOptions("client");

        expect(options.enabled).toBe(false);
        expect(options.tracesSampleRate).toBe(0);
        expect(options.replaysSessionSampleRate).toBe(0);
        expect(options.replaysOnErrorSampleRate).toBe(0);
      });
    });

    describe("common options", () => {
      it("sets sendDefaultPii to false", () => {
        const options = createSentryOptions("client");

        expect(options.sendDefaultPii).toBe(false);
      });

      it("attaches beforeSend hook", () => {
        const options = createSentryOptions("client");

        expect(options.beforeSend).toBeDefined();
        expect(typeof options.beforeSend).toBe("function");
      });

      it("attaches beforeBreadcrumb hook", () => {
        const options = createSentryOptions("client");

        expect(options.beforeBreadcrumb).toBeDefined();
        expect(typeof options.beforeBreadcrumb).toBe("function");
      });
    });
  });
});
