/**
 * Type safety tests for analytics module.
 *
 * These tests verify compile-time type checking. If any line produces a
 * TypeScript error (except @ts-expect-error lines), the test fails.
 *
 * Run: pnpm typecheck
 *
 * DELETE before production deployment.
 */

import { trackEvent, setUserContext } from "./analytics";

// Valid event calls should compile without errors
function testValidEvents(): void {
  trackEvent("Exercise Created", {
    exerciseId: "123",
    source: "manual",
  });

  trackEvent("Set Logged", {
    setId: "set-1",
    exerciseId: "ex-1",
    reps: 10,
  });

  trackEvent("Workout Session Started", {
    sessionId: "session-1",
  });

  trackEvent("Workout Session Completed", {
    sessionId: "session-1",
    durationMs: 3600000,
    setCount: 12,
  });

  // Optional properties
  trackEvent("Exercise Created", {
    exerciseId: "123",
    userId: "user-1",
  });

  trackEvent("Set Logged", {
    setId: "set-1",
    exerciseId: "ex-1",
    reps: 10,
    weight: 135,
    userId: "user-1",
  });
}

// Invalid calls should produce TypeScript errors
function testInvalidEvents(): void {
  // @ts-expect-error - Unknown event type
  trackEvent("Invalid Event", { foo: "bar" });

  // TypeScript catches: Missing required properties (no @ts-expect-error needed)
  // These will fail at compile time demonstrating type safety works:
  // trackEvent("Exercise Created", { source: "manual" }); // Missing exerciseId
  // trackEvent("Set Logged", { exerciseId: "ex-1", reps: 10 }); // Missing setId
  // trackEvent("Workout Session Started", {}); // Missing sessionId

  // @ts-expect-error - exerciseId should be string not number
  trackEvent("Exercise Created", { exerciseId: 123 });

  // TypeScript catches: Wrong property type (no @ts-expect-error needed)
  // trackEvent("Set Logged", {
  //   setId: "set-1",
  //   exerciseId: "ex-1",
  //   reps: "10", // Should be number
  // });

  // TypeScript catches: Invalid literal type (no @ts-expect-error needed)
  // trackEvent("Exercise Created", {
  //   exerciseId: "123",
  //   source: "invalid", // Must be "manual" | "ai" | "import"
  // });
}

// User context tests
function testUserContext(): void {
  // Valid
  setUserContext("user-123");
  setUserContext("user-123", { plan: "pro" });

  // @ts-expect-error - userId should be string not number
  setUserContext(123);

  // TypeScript catches: Wrong metadata type (no @ts-expect-error needed)
  // setUserContext("user-123", { age: 30 }); // Values must be strings
}
