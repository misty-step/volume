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

    posthog.init(posthogKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: "history_change",
    });
  }, []);

  if (process.env.NODE_ENV === "test") {
    return <>{children}</>;
  }

  return <PostHogProviderBase client={posthog}>{children}</PostHogProviderBase>;
}
