"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PostHogProviderBase } from "posthog-js/react";

type PostHogProviderProps = {
  children: React.ReactNode;
};

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!posthogKey) {
      return;
    }

    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: "history_change",
    });
  }, []);

  if (process.env.NODE_ENV === "test") {
    return <>{children}</>;
  }

  return <PostHogProviderBase client={posthog}>{children}</PostHogProviderBase>;
}
