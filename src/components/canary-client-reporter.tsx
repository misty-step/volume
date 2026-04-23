"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/analytics";

function toError(value: unknown, fallbackMessage: string): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string" && value.trim()) {
    return new Error(value.trim());
  }

  const error = new Error(fallbackMessage);
  (error as Error & { cause?: unknown }).cause = value;
  return error;
}

export function CanaryClientReporter() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportError(toError(event.error, event.message || "Unhandled error"), {
        boundary: "window.error",
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(toError(event.reason, "Unhandled promise rejection"), {
        boundary: "window.unhandledrejection",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  return null;
}
