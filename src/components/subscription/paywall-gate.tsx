"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
 */
export function PaywallGate({ children }: PaywallGateProps) {
  const router = useRouter();
  const subscriptionStatus = useQuery(api.users.getSubscriptionStatus);

  useEffect(() => {
    // Wait for query to load
    if (subscriptionStatus === undefined) return;

    // If no subscription data (new user), they'll get created with trial
    if (subscriptionStatus === null) return;

    // Redirect to pricing if no access
    if (!subscriptionStatus.hasAccess) {
      router.replace("/pricing?reason=expired");
    }
  }, [subscriptionStatus, router]);

  // Loading state
  if (subscriptionStatus === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No access - show nothing while redirecting
  if (subscriptionStatus && !subscriptionStatus.hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
