"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "app/error.tsx" });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="text-muted-foreground mb-8">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
