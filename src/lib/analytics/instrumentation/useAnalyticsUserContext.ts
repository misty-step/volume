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
    } else {
      // Clear context on logout or if user is null
      clearUserContext();
    }

    // Cleanup on unmount (though provider usually stays mounted)
    return () => {
      // We don't clear on unmount because navigation might unmount components
      // but we want context to persist across page views if SPA nav.
      // However, if the hook itself unmounts (e.g. app close), clearing is fine.
      // But for standard navigation, we rely on the useEffect dependency [user].
      // Actually, if the user logs out, 'user' becomes null, triggering the effect, calling clearUserContext.
      // If the component unmounts, we might want to leave it?
      // No, ContextManager is module-level singleton.
      // If we unmount the Provider (e.g. hot reload or strict mode), we might clear it.
      // Let's leave cleanup to the effect dependencies.
    };
  }, [isLoaded, isSignedIn, user?.id, user?.publicMetadata?.plan]);
}
