import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { readFileSync } from "fs";
import { join } from "path";

// Read package.json version at build time
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "package.json"), "utf-8")
);
const packageVersion = packageJson.version;

// PostHog ingestion proxy destinations.
// Override via env vars for EU or self-hosted deployments.
const posthogIngestHost =
  process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST ?? "https://us.i.posthog.com";
const posthogAssetsHost =
  process.env.NEXT_PUBLIC_POSTHOG_ASSETS_HOST ??
  "https://us-assets.i.posthog.com";

const nextConfig: NextConfig = {
  env: {
    // Inject package.json version at build time for client-side access
    NEXT_PUBLIC_PACKAGE_VERSION: packageVersion,
  },
  async rewrites() {
    return [
      // Static assets — must come before catch-all
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      // Decide endpoint — must come before catch-all or it is swallowed
      {
        source: "/ingest/decide",
        destination: `${posthogIngestHost}/decide`,
      },
      // Catch-all for all other ingest paths
      {
        source: "/ingest/:path*",
        destination: `${posthogIngestHost}/:path*`,
      },
    ];
  },
  async redirects() {
    // Block test endpoints in production builds
    if (process.env.NODE_ENV === "production") {
      return [
        {
          source: "/api/test/:path*",
          destination: "/404",
          permanent: false,
        },
      ];
    }
    return [];
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
