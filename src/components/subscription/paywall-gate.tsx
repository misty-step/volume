"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface PaywallGateProps {
  children: React.ReactNode;
}

/**
 * PaywallGate - Wraps authenticated routes to enforce subscription access
 *
 * Checks subscription status and redirects to pricing page if:
 * - Trial has expired
 * - Subscription is expired/canceled
 *
 * Allows access if:
 * - User has active subscription
 * - User is within trial period
 *
 * Auto-creates user with trial if no record exists (handles edge case
 * where user navigates to protected route before getOrCreateUser is called).
 */
export function PaywallGate({ children }: PaywallGateProps) {
  const router = useRouter();
  const subscriptionStatus = useQuery(api.users.getSubscriptionStatus);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const userCreationInFlight = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    // Wait for query to load
    if (subscriptionStatus === undefined) return;

    // Auto-create user with trial if no record exists
    if (subscriptionStatus === null) {
      if (!userCreationInFlight.current) {
        userCreationInFlight.current = getOrCreateUser({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
          .catch((error) => {
            console.error("Failed to create user record:", error);
          })
          .finally(() => {
            userCreationInFlight.current = null;
          });
      }
      return;
    }

    // Redirect to pricing if no access
    if (subscriptionStatus && !subscriptionStatus.hasAccess) {
      router.replace("/pricing?reason=expired");
    }
  }, [subscriptionStatus, router, getOrCreateUser]);

  // Loading state (includes waiting for user creation)
  if (subscriptionStatus === undefined || subscriptionStatus === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No access - show nothing while redirecting
  if (!subscriptionStatus.hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
