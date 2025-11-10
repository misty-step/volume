"use client";

import { Button } from "@/components/ui/button";
import { trackEvent, setUserContext, clearUserContext } from "@/lib/analytics";

/**
 * Interactive UI for analytics testing.
 *
 * Tests:
 * - PII redaction in event properties
 * - Type-safe event tracking
 * - User context enrichment
 * - URL filtering (check Vercel Analytics dashboard)
 */
export default function TestAnalyticsClient() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Analytics Tests</h1>

      <Button
        onClick={() =>
          trackEvent("Exercise Created", {
            exerciseId: "test-123",
            source: "manual",
          })
        }
        variant="outline"
      >
        1. Track Exercise Created
      </Button>

      <Button
        onClick={() =>
          trackEvent("Set Logged", {
            setId: "set-456",
            exerciseId: "ex-789",
            reps: 10,
            weight: 135,
          })
        }
        variant="outline"
      >
        2. Track Set Logged
      </Button>

      <Button
        onClick={() =>
          trackEvent("Workout Session Started", {
            sessionId: "session-abc",
          })
        }
        variant="outline"
      >
        3. Track Session Started
      </Button>

      <Button
        onClick={() =>
          trackEvent("Workout Session Completed", {
            sessionId: "session-abc",
            durationMs: 3600000,
            setCount: 12,
          })
        }
        variant="outline"
      >
        4. Track Session Completed
      </Button>

      <Button
        onClick={() =>
          setUserContext("user-test-123", {
            email: "test@example.com",
            username: "testuser",
          })
        }
        variant="outline"
      >
        5. Set User Context
      </Button>

      <Button onClick={clearUserContext} variant="outline">
        6. Clear User Context
      </Button>

      <Button
        onClick={() => void fetch("/api/test-error?type=report")}
        variant="outline"
      >
        7. Test Server Analytics
      </Button>
    </div>
  );
}
