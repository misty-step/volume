import { useEffect } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";

/**
 * Timezone Sync Hook
 *
 * Automatically detects and syncs the user's timezone to the backend on mount.
 * Uses the Intl.DateTimeFormat API to get the browser's detected IANA timezone.
 *
 * This hook should be called once per session, typically in a root-level component
 * after user authentication. The backend mutation (updateUserTimezone) is idempotent
 * and will create a user record if it doesn't exist.
 *
 * **Auth Safety**: Only fires after Clerk confirms user is signed in to prevent
 * "Unauthorized" errors during auth loading state.
 *
 * @example
 * ```tsx
 * function RootLayout() {
 *   useTimezoneSync();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useTimezoneSync() {
  const { isLoaded, isSignedIn } = useUser();
  const updateTimezone = useMutation(api.users.updateUserTimezone);

  useEffect(() => {
    // Only proceed if Clerk has loaded and user is signed in
    if (!isLoaded || !isSignedIn) return;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Only update if we have a valid timezone
    if (timezone) {
      updateTimezone({ timezone }).catch((error) => {
        console.warn("Failed to sync timezone:", error);
      });
    }
  }, [isLoaded, isSignedIn, updateTimezone]);
}
