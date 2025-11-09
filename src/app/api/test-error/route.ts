import { reportError } from "@/lib/analytics";

/**
 * Temporary API route for testing server-side Sentry error capture.
 * DELETE before production deployment.
 *
 * Usage:
 *   /api/test-error?type=throw   - Test thrown errors
 *   /api/test-error?type=report  - Test manual reporting
 *   /api/test-error?type=pii     - Test PII redaction
 */
export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");

  if (type === "throw") {
    throw new Error("Test: server-side error (thrown)");
  }

  if (type === "report") {
    reportError(new Error("Test: server-side error (manual report)"), {
      context: "api-test-error",
    });
    return new Response(null, { status: 200 });
  }

  if (type === "pii") {
    reportError(new Error("Test: server PII redaction - admin@example.com"), {
      userEmail: "admin@example.com",
      ipAddress: "192.168.1.1",
    });
    return new Response(null, { status: 200 });
  }

  throw new Error(`Invalid test type: ${type}`);
}
