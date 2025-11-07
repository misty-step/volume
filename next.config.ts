import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://*.convex.cloud",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://*.convex.cloud wss://*.convex.cloud",
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

export default bundleAnalyzer(nextConfig);
