import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./content-security-policy";

describe("buildContentSecurityPolicy", () => {
  it("includes the Canary origin in connect-src when configured", () => {
    const policy = buildContentSecurityPolicy({
      canaryEndpoint: "https://canary.example/ingest",
    });

    expect(policy).toContain(
      "connect-src 'self' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://*.convex.cloud wss://*.convex.cloud https://va.vercel-scripts.com https://vitals.vercel-insights.com https://clerk-telemetry.com https://*.posthog.com https://canary.example"
    );
  });

  it("adds upgrade-insecure-requests only when requested", () => {
    expect(
      buildContentSecurityPolicy({ includeUpgradeInsecureRequests: false })
    ).not.toContain("upgrade-insecure-requests");

    expect(
      buildContentSecurityPolicy({ includeUpgradeInsecureRequests: true })
    ).toContain("upgrade-insecure-requests");
  });
});
