import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { readFileSync } from "fs";
import { join } from "path";
import { buildContentSecurityPolicy } from "./src/lib/content-security-policy";
import { isServerProductionDeployment } from "./src/lib/environment";

// Read package.json version at build time
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "package.json"), "utf-8")
);
const packageVersion = packageJson.version;

const nextConfig: NextConfig = {
  env: {
    // Inject package.json version at build time for client-side access
    NEXT_PUBLIC_PACKAGE_VERSION: packageVersion,
    // Expose deployment environment so browser-safe config can fail closed
    // during SSR before hydration in preview/production builds.
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },
  async redirects() {
    // Block test endpoints in production deployments.
    // Preview deployments should still expose these routes for e2e flows.
    if (isServerProductionDeployment()) {
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
            value: buildContentSecurityPolicy({
              canaryEndpoint: process.env.NEXT_PUBLIC_CANARY_ENDPOINT,
              includeUpgradeInsecureRequests: true,
            }),
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

export default bundleAnalyzer(nextConfig);
