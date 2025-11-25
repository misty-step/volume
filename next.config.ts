import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { resolveVersion } from "./src/lib/version";
import { readFileSync } from "fs";
import { join } from "path";

// Read package.json version at build time
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "package.json"), "utf-8")
);
const packageVersion = packageJson.version;

const nextConfig: NextConfig = {
  env: {
    // Expose a deterministic, pre-resolved app version to the client.
    NEXT_PUBLIC_APP_VERSION: resolveVersion(),
    // Inject package.json version at build time for production fallback
    NEXT_PUBLIC_PACKAGE_VERSION: packageVersion,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking attacks
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME-sniffing attacks
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Control referer information leakage
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Restrict browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Enforce HTTPS in production
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Content Security Policy (pragmatic approach for Clerk + Convex)
          // Note: unsafe-inline/unsafe-eval required - Clerk auth flows need inline scripts,
          // Convex real-time sync requires eval for WebSocket message handling
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://*.convex.cloud https://browser.sentry-cdn.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://*.convex.cloud wss://*.convex.cloud https://*.ingest.sentry.io",
              "font-src 'self' data:",
              "frame-src https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// Enable bundle analyzer only when ANALYZE=true
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Sentry source map upload configuration
const sentryWebpackPluginOptions = {
  // Only run in CI or when auth token present
  silent: !process.env.CI,
  // Hide source maps from generated client bundles (security)
  hideSourceMaps: true,
  // Tree-shake Sentry logger statements in production (bundle size)
  disableLogger: true,
  // Upload more files for better stack traces
  widenClientFileUpload: true,
  // Enable automatic Vercel cron monitoring
  automaticVercelMonitors: true,
  // Disable upload if no auth token (local dev)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
};

export default withSentryConfig(
  bundleAnalyzer(nextConfig),
  sentryWebpackPluginOptions
);
