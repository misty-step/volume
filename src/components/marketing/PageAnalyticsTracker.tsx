"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics";

export function PageAnalyticsTracker() {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;

    trackEvent("Marketing Page View", {
      path: window.location.pathname,
    });

    trackedRef.current = true;
  }, []);

  return null;
}
