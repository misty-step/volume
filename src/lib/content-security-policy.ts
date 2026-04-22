const SCRIPT_SOURCES = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "https://*.clerk.com",
  "https://clerk.volume.fitness",
  "https://*.clerk.accounts.dev",
  "https://*.convex.cloud",
  "https://challenges.cloudflare.com",
  "https://vercel.live",
  "https://va.vercel-scripts.com",
];

const STYLE_SOURCES = [
  "'self'",
  "'unsafe-inline'",
  "https://*.clerk.com",
  "https://clerk.volume.fitness",
  "https://*.clerk.accounts.dev",
];

const CONNECT_SOURCES = [
  "'self'",
  "https://*.clerk.com",
  "https://clerk.volume.fitness",
  "https://*.clerk.accounts.dev",
  "https://*.convex.cloud",
  "wss://*.convex.cloud",
  "https://va.vercel-scripts.com",
  "https://vitals.vercel-insights.com",
  "https://clerk-telemetry.com",
  "https://*.posthog.com",
];

const FRAME_SOURCES = [
  "'self'",
  "https://*.clerk.com",
  "https://clerk.volume.fitness",
  "https://*.clerk.accounts.dev",
  "https://challenges.cloudflare.com",
  "https://vercel.live",
  "https://*.posthog.com",
];

function getCanaryConnectOrigins(endpoint: string | undefined): string[] {
  const trimmedEndpoint = endpoint?.trim();
  if (!trimmedEndpoint) return [];

  try {
    return [new URL(trimmedEndpoint).origin];
  } catch {
    return [];
  }
}

export function buildContentSecurityPolicy({
  canaryEndpoint,
  includeUpgradeInsecureRequests = false,
}: {
  canaryEndpoint?: string;
  includeUpgradeInsecureRequests?: boolean;
} = {}): string {
  const directives = [
    "default-src 'self'",
    `script-src ${SCRIPT_SOURCES.join(" ")}`,
    `style-src ${STYLE_SOURCES.join(" ")}`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `connect-src ${[...CONNECT_SOURCES, ...getCanaryConnectOrigins(canaryEndpoint)].join(" ")}`,
    `frame-src ${FRAME_SOURCES.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "block-all-mixed-content",
  ];

  if (includeUpgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
