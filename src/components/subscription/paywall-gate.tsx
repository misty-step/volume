"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
 * Handles post-checkout verification:
 * - Detects checkout=success query param
 * - Waits for webhook to update subscription status
 * - Triggers backup sync after 4s if webhook delayed
 * - Shows friendly error after 10s timeout
 */
export function PaywallGate({ children }: PaywallGateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Convex hooks
  const subscriptionStatus = useQuery(api.users.getSubscriptionStatus);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const syncCheckout = useAction(api.stripe.syncCheckoutSession);

  // State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationTimeout, setVerificationTimeout] = useState(false);

  // Refs
  const userCreationInFlight = useRef<Promise<unknown> | null>(null);
  const hasSyncedRef = useRef(false);
  const hasShownSuccessRef = useRef(false);

  // 1. Handle checkout redirect on mount
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkoutStatus === "success" && sessionId) {
      // Store session ID for backup sync
      sessionStorage.setItem("pending_checkout_session", sessionId);
      // Schedule state update for next tick to avoid setState in effect body
      const timer = setTimeout(() => setIsVerifying(true), 0);
      // Clean URL immediately to prevent re-trigger on refresh
      router.replace(window.location.pathname);
      return () => clearTimeout(timer);
    }

    if (checkoutStatus === "canceled") {
      toast.info("Checkout canceled");
      router.replace("/pricing");
    }

    return undefined;
  }, [searchParams, router]);

  // 2. Handle successful subscription activation
  useEffect(() => {
    if (!isVerifying || !subscriptionStatus?.hasAccess) return;

    // Success: subscription activated - cleanup and notify
    sessionStorage.removeItem("pending_checkout_session");
    if (!hasShownSuccessRef.current) {
      hasShownSuccessRef.current = true;
      toast.success("Welcome to Volume Pro!");
    }
    // Schedule state update for next tick to avoid setState in effect body
    const cleanup = setTimeout(() => setIsVerifying(false), 0);
    return () => clearTimeout(cleanup);
  }, [isVerifying, subscriptionStatus?.hasAccess]);

  // 3. Verification timeout and backup sync logic
  useEffect(() => {
    if (!isVerifying || subscriptionStatus?.hasAccess) return;

    // Backup sync at 4 seconds
    const backupTimer = setTimeout(async () => {
      if (hasSyncedRef.current) return;
      hasSyncedRef.current = true;

      const sessionId = sessionStorage.getItem("pending_checkout_session");
      if (sessionId) {
        console.warn("Webhook delayed, triggering backup sync...");
        try {
          const result = await syncCheckout({ sessionId });
          if (!result.success) {
            console.warn("Backup sync returned:", result.error);
          }
        } catch (err) {
          console.error("Backup sync failed:", err);
        }
      }
    }, 4000);

    // Hard timeout at 10 seconds
    const timeoutTimer = setTimeout(() => setVerificationTimeout(true), 10000);

    return () => {
      clearTimeout(backupTimer);
      clearTimeout(timeoutTimer);
    };
  }, [isVerifying, subscriptionStatus?.hasAccess, syncCheckout]);

  // 4. Auto-create user if no record exists
  useEffect(() => {
    if (subscriptionStatus === undefined) return;
    if (subscriptionStatus === null && !userCreationInFlight.current) {
      userCreationInFlight.current = getOrCreateUser({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
        .catch((error) => console.error("Failed to create user:", error))
        .finally(() => {
          userCreationInFlight.current = null;
        });
    }
  }, [subscriptionStatus, getOrCreateUser]);

  // 5. Redirect to pricing if no access (but not during verification)
  useEffect(() => {
    if (subscriptionStatus === undefined || subscriptionStatus === null) return;
    if (isVerifying && !verificationTimeout) return;

    if (!subscriptionStatus.hasAccess) {
      if (verificationTimeout) {
        toast.error(
          "Verification timed out. Please contact support if you paid."
        );
      }
      router.replace("/pricing?reason=expired");
    }
  }, [subscriptionStatus, isVerifying, verificationTimeout, router]);

  // --- Render States ---

  // Verifying payment
  if (isVerifying && !verificationTimeout) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="animate-pulse text-muted-foreground">
          Verifying your payment...
        </p>
      </div>
    );
  }

  // Timeout error
  if (verificationTimeout && !subscriptionStatus?.hasAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-lg font-medium">Payment received!</p>
        <p className="max-w-md text-muted-foreground">
          Your subscription is being activated. This usually takes a few
          seconds. Please refresh the page or contact support if this persists.
        </p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  // Loading state
  if (subscriptionStatus === undefined || subscriptionStatus === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No access - show loading while redirecting
  if (!subscriptionStatus.hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access granted
  return <>{children}</>;
}
