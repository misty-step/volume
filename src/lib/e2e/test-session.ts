import type { NextResponse } from "next/server";
import { isServerProductionDeployment } from "@/lib/environment";

export const E2E_SESSION_COOKIE_NAME = "__volume_e2e_session";

function getConfiguredTestSecret(): string | null {
  const secret = process.env.TEST_RESET_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

function readCookieValue(
  cookieHeader: string | null,
  name: string
): string | null {
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName !== name) continue;
    return rawValue.join("=");
  }

  return null;
}

export function hasValidE2ETestSession(request: Request): boolean {
  if (isServerProductionDeployment()) return false;

  const secret = getConfiguredTestSecret();
  if (!secret) return false;

  return (
    readCookieValue(request.headers.get("cookie"), E2E_SESSION_COOKIE_NAME) ===
    secret
  );
}

export function applyE2ETestSessionCookie<T extends NextResponse>(
  response: T
): T {
  if (isServerProductionDeployment()) return response;

  const secret = getConfiguredTestSecret();
  if (!secret) return response;

  response.cookies.set({
    name: E2E_SESSION_COOKIE_NAME,
    value: secret,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
