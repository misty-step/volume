"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PostHogProviderBase } from "posthog-js/react";

type PostHogProviderProps = {
  children: React.ReactNode;
};

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey) return;

    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest";
    // ui_host is the PostHog UI origin — needed when api_host is a proxy/different host.
    // Configurable via NEXT_PUBLIC_POSTHOG_UI_HOST for EU/self-hosted deployments.
    const uiHost =
      process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || "https://us.posthog.com";
    posthog.init(posthogKey, {
      api_host: apiHost,
      ui_host: uiHost,
      capture_pageview: "history_change",
    });
  }, []);

  if (process.env.NODE_ENV === "test" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PostHogProviderBase client={posthog}>{children}</PostHogProviderBase>;
}
