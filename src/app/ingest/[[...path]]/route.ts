import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEFAULT_INGEST_HOST = "https://us.i.posthog.com";
const DEFAULT_ASSETS_HOST = "https://us-assets.i.posthog.com";
const DEFAULT_TIMEOUT_MS = 5_000;
const HOP_BY_HOP_HEADERS = [
  "authorization",
  "connection",
  "content-length",
  "cookie",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

type IngestRouteContext = {
  params: { path?: string[] } | Promise<{ path?: string[] }>;
};

function getProxyTimeoutMs(): number {
  const timeoutMs = Number(process.env.POSTHOG_PROXY_TIMEOUT_MS);
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return timeoutMs;
  }
  return DEFAULT_TIMEOUT_MS;
}

function buildUpstreamUrl(pathSegments: string[], search: string): string {
  const [firstSegment, ...rest] = pathSegments;
  const isStaticAsset = firstSegment === "static";
  const upstreamHost =
    (isStaticAsset
      ? process.env.NEXT_PUBLIC_POSTHOG_ASSETS_HOST
      : process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST) ??
    (isStaticAsset ? DEFAULT_ASSETS_HOST : DEFAULT_INGEST_HOST);

  const upstreamPath = isStaticAsset
    ? `/static/${rest.join("/")}`
    : `/${pathSegments.join("/")}`;

  const normalizedHost = upstreamHost.replace(/\/+$/, "");
  const normalizedPath = upstreamPath.replace(/\/{2,}/g, "/") || "/";

  return `${normalizedHost}${normalizedPath}${search}`;
}

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    headers.set("x-forwarded-for", forwardedFor);
  }
  return headers;
}

function buildResponseHeaders(
  upstreamHeaders: Headers,
  isStaticAsset: boolean
): Headers {
  const headers = new Headers(upstreamHeaders);
  headers.delete("set-cookie");
  if (!isStaticAsset) {
    headers.set("cache-control", "no-store");
  }
  return headers;
}

async function proxyIngestRequest(
  request: NextRequest,
  context: IngestRouteContext
) {
  const { path = [] } = await Promise.resolve(context.params);
  const isStaticAsset = path[0] === "static";
  const timeoutSignal = AbortSignal.timeout(getProxyTimeoutMs());

  try {
    const upstreamResponse = await fetch(
      buildUpstreamUrl(path, request.nextUrl.search),
      {
        method: request.method,
        headers: buildForwardHeaders(request),
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : await request.arrayBuffer(),
        redirect: "manual",
        cache: "no-store",
        signal: timeoutSignal,
      }
    );

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: buildResponseHeaders(upstreamResponse.headers, isStaticAsset),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      return NextResponse.json(
        { error: "PostHog ingest proxy timed out" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "PostHog ingest proxy failed" },
      { status: 502 }
    );
  }
}

export const runtime = "edge";

export async function GET(request: NextRequest, context: IngestRouteContext) {
  return proxyIngestRequest(request, context);
}

export async function POST(request: NextRequest, context: IngestRouteContext) {
  return proxyIngestRequest(request, context);
}

export async function PUT(request: NextRequest, context: IngestRouteContext) {
  return proxyIngestRequest(request, context);
}

export async function PATCH(request: NextRequest, context: IngestRouteContext) {
  return proxyIngestRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: IngestRouteContext
) {
  return proxyIngestRequest(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: IngestRouteContext
) {
  return proxyIngestRequest(request, context);
}

export async function HEAD(request: NextRequest, context: IngestRouteContext) {
  return proxyIngestRequest(request, context);
}
