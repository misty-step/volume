"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PostHogProviderBase } from "posthog-js/react";

type PostHogProviderProps = {
  children: React.ReactNode;
};

const DEFAULT_UI_HOST = "https://us.posthog.com";

function deriveUiHost(apiHost: string): string | undefined {
  if (process.env.NEXT_PUBLIC_POSTHOG_UI_HOST) {
    return process.env.NEXT_PUBLIC_POSTHOG_UI_HOST;
  }

  const sourceHost = apiHost.startsWith("/")
    ? process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST
    : apiHost;

  if (!sourceHost) {
    return DEFAULT_UI_HOST;
  }

  try {
    const url = new URL(sourceHost);
    const posthogCloud = url.hostname.match(/^([a-z0-9-]+)\.i\.posthog\.com$/i);
    if (posthogCloud) {
      return `${url.protocol}//${posthogCloud[1]}.posthog.com`;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isDoNotTrackEnabled(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "yes";
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey) return;

    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest";
    const uiHost = deriveUiHost(apiHost);
    posthog.init(posthogKey, {
      api_host: apiHost,
      ...(uiHost ? { ui_host: uiHost } : {}),
      capture_pageview: "history_change",
    });

    const dntValue =
      typeof navigator === "undefined" ? undefined : navigator.doNotTrack;
    if (isDoNotTrackEnabled(dntValue)) {
      posthog.opt_out_capturing();
    }
  }, []);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PostHogProviderBase client={posthog}>{children}</PostHogProviderBase>;
}
