"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { setUserContext, clearUserContext } from "../context";

/**
 * React hook to synchronize Clerk user state with analytics context.
 *
 * Automatically sets/clears user context when user logs in/out.
 * Consumed by AnalyticsUserProvider.
 */
export function useAnalyticsUserContext() {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      // Map Clerk user data to analytics context
      setUserContext(user.id, {
        plan: (user.publicMetadata?.plan as string) || "free",
        // Add other relevant metadata here safely
      });
    }
    // Clear context on logout or if user is null
    if (!isSignedIn || !user) {
      clearUserContext();
    }
  }, [isLoaded, isSignedIn, user]);
}
