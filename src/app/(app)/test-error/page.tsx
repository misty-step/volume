"use client";

import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/analytics";

/**
 * Temporary test page for Sentry integration.
 * DELETE before production deployment.
 */
export default function TestErrorPage() {
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-lg font-semibold mb-4">Sentry Error Tests</h1>

      <Button
        onClick={() => {
          throw new Error("Test: error boundary");
        }}
        variant="destructive"
      >
        1. Throw Error (boundary)
      </Button>

      <Button
        onClick={() => reportError(new Error("Test: manual report"))}
        variant="outline"
      >
        2. Manual Report
      </Button>

      <Button
        onClick={() =>
          reportError(new Error("Test: PII redaction - user@example.com"), {
            userEmail: "test@example.com",
            phoneNumber: "555-1234",
          })
        }
        variant="outline"
      >
        3. PII Redaction
      </Button>
    </div>
  );
}
