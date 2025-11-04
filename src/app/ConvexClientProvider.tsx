"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ReactNode } from "react";
import { useTimezoneSync } from "@/hooks/useTimezoneSync";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Timezone Sync Component
 *
 * Automatically syncs user timezone when authenticated.
 * Rendered inside ConvexProviderWithClerk to ensure Convex context is available.
 * The backend mutation validates authentication and will fail gracefully if not signed in.
 */
function TimezoneSync() {
  useTimezoneSync();
  return null;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <TimezoneSync />
      {children}
    </ConvexProviderWithClerk>
  );
}
