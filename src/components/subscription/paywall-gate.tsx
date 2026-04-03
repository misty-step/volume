"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useEffectEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reportError, trackEvent } from "@/lib/analytics";

interface PaywallGateProps {
  children: React.ReactNode;
}

type BootstrapPhase =
  | "clerk"
  | "convex_auth"
  | "subscription_query"
  | "user_bootstrap";

type SubscriptionGateStatus =
  | { hasAccess: boolean; status: string }
  | null
  | undefined;

type BootstrapPhaseInput = {
  isClerkLoaded: boolean;
  isSignedOut: boolean;
  isAuthenticated: boolean;
  isConvexAuthLoading: boolean;
  authReady: boolean;
  subscriptionStatus: SubscriptionGateStatus;
  userBootstrapError: Error | null;
};

const BOOTSTRAP_TIMEOUT_MS = 8000;

const BOOTSTRAP_MESSAGES: Record<BootstrapPhase, string> = {
  clerk: "Checking your session...",
  convex_auth: "Connecting your account...",
  subscription_query: "Loading your workspace...",
  user_bootstrap: "Setting up your account...",
};

export function getBootstrapPhase({
  isClerkLoaded,
  isSignedOut,
  isAuthenticated,
  isConvexAuthLoading,
  authReady,
  subscriptionStatus,
  userBootstrapError,
}: BootstrapPhaseInput): BootstrapPhase | null {
  if (!isClerkLoaded) return "clerk";
  if (isSignedOut) return null;
  if (!isAuthenticated || isConvexAuthLoading) return "convex_auth";
  if (authReady && subscriptionStatus === undefined) {
    return "subscription_query";
  }
  if (authReady && subscriptionStatus === null && !userBootstrapError) {
    return "user_bootstrap";
  }
  return null;
}

function renderCenteredState({
  testId,
  message,
  iconClassName,
  messageClassName = "text-sm text-muted-foreground",
}: {
  testId: string;
  message: string;
  iconClassName: string;
  messageClassName?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex min-h-screen flex-col items-center justify-center gap-4"
    >
      <Loader2 className={iconClassName} />
      <p className={messageClassName}>{message}</p>
    </div>
  );
}

function renderRefreshState(title: string, message: string, testId?: string) {
  return (
    <div
      data-testid={testId}
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center"
    >
      <p className="text-lg font-medium">{title}</p>
      <p className="max-w-md text-muted-foreground">{message}</p>
      <Button onClick={() => window.location.reload()}>Refresh Page</Button>
    </div>
  );
}

function getBootstrapErrorCopy(activeUserBootstrapError: Error | null) {
  if (activeUserBootstrapError) {
    return {
      title: "We couldn't finish loading your account.",
      message:
        "Please refresh the page. If this keeps happening, contact support.",
    };
  }

  return {
    title: "We couldn't finish connecting to Volume.",
    message:
      "Authentication took too long. Refresh the page and sign in again if needed.",
  };
}

type PaywallRenderState =
  | { kind: "signed_out" }
  | { kind: "verifying" }
  | { kind: "verification_timeout" }
  | { kind: "bootstrap_error"; title: string; message: string }
  | { kind: "loading"; message: string }
  | { kind: "redirecting" }
  | { kind: "content" };

function getPaywallRenderState({
  isSignedOut,
  isVerifying,
  verificationTimeout,
  bootstrapTimeoutPhase,
  bootstrapPhase,
  subscriptionStatus,
  userBootstrapError,
}: {
  isSignedOut: boolean;
  isVerifying: boolean;
  verificationTimeout: boolean;
  bootstrapTimeoutPhase: BootstrapPhase | null;
  bootstrapPhase: BootstrapPhase | null;
  subscriptionStatus: SubscriptionGateStatus;
  userBootstrapError: Error | null;
}): PaywallRenderState {
  if (isSignedOut) {
    return { kind: "signed_out" };
  }

  if (isVerifying && !verificationTimeout) {
    return { kind: "verifying" };
  }

  const activeUserBootstrapError =
    subscriptionStatus === null ? userBootstrapError : null;

  if (verificationTimeout && !subscriptionStatus?.hasAccess) {
    return { kind: "verification_timeout" };
  }

  if (
    (bootstrapTimeoutPhase && !subscriptionStatus?.hasAccess) ||
    activeUserBootstrapError
  ) {
    return {
      kind: "bootstrap_error",
      ...getBootstrapErrorCopy(activeUserBootstrapError),
    };
  }

  if (
    bootstrapPhase ||
    subscriptionStatus === undefined ||
    subscriptionStatus === null
  ) {
    return {
      kind: "loading",
      message: bootstrapPhase
        ? BOOTSTRAP_MESSAGES[bootstrapPhase]
        : "Loading your workspace...",
    };
  }

  if (!subscriptionStatus.hasAccess) {
    return { kind: "redirecting" };
  }

  return { kind: "content" };
}

function renderPaywallState(
  renderState: PaywallRenderState,
  children: React.ReactNode
) {
  switch (renderState.kind) {
    case "signed_out":
      return renderCenteredState({
        testId: "paywall-signed-out",
        message: "Your session expired. Redirecting you to sign in...",
        iconClassName: "h-8 w-8 animate-spin text-muted-foreground",
      });
    case "verifying":
      return renderCenteredState({
        testId: "paywall-verifying",
        message: "Verifying your payment...",
        iconClassName: "h-8 w-8 animate-spin text-primary",
        messageClassName: "animate-pulse text-muted-foreground",
      });
    case "verification_timeout":
      return renderRefreshState(
        "Payment received!",
        "Your subscription is being activated. This usually takes a few seconds. Please refresh the page or contact support if this persists."
      );
    case "bootstrap_error":
      return renderRefreshState(
        renderState.title,
        renderState.message,
        "paywall-bootstrap-error"
      );
    case "loading":
      return renderCenteredState({
        testId: "paywall-loading",
        message: renderState.message,
        iconClassName: "h-8 w-8 animate-spin text-muted-foreground",
      });
    case "redirecting":
      return (
        <div
          data-testid="paywall-redirecting"
          className="flex min-h-screen items-center justify-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    case "content":
      return <>{children}</>;
  }
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
  const { isLoaded: isClerkLoaded, userId } = useAuth();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();

  // Convex hooks
  const authReady =
    isClerkLoaded && Boolean(userId) && !isConvexAuthLoading && isAuthenticated;
  const subscriptionStatus = useQuery(
    api.users.getSubscriptionStatus,
    authReady ? {} : "skip"
  );
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const syncCheckout = useAction(api.stripe.syncCheckoutSession);

  // State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationTimeout, setVerificationTimeout] = useState(false);
  const [bootstrapTimeoutPhase, setBootstrapTimeoutPhase] =
    useState<BootstrapPhase | null>(null);
  const [userBootstrapError, setUserBootstrapError] = useState<Error | null>(
    null
  );

  // Refs
  const hasAttemptedUserCreationRef = useRef(false);
  const hasSyncedRef = useRef(false);
  const hasShownSuccessRef = useRef(false);
  const reportedBootstrapPhasesRef = useRef<Set<BootstrapPhase>>(new Set());
  const hasReportedVerificationTimeoutRef = useRef(false);
  const hasReportedSignedOutRedirectRef = useRef(false);
  const checkoutContextRef = useRef<{
    checkoutStatus: string | null;
    sessionId: string | null;
  }>({
    checkoutStatus: null,
    sessionId: null,
  });

  const isSignedOut = isClerkLoaded && !userId;
  const readBootstrapTelemetry = useEffectEvent(() => ({
    hasUserId: Boolean(userId),
    isClerkLoaded,
    isConvexAuthLoading,
    isAuthenticated,
    isVerifying,
  }));

  const bootstrapPhase = getBootstrapPhase({
    isClerkLoaded,
    isSignedOut,
    isAuthenticated,
    isConvexAuthLoading,
    authReady,
    subscriptionStatus,
    userBootstrapError,
  });

  // 1. Handle checkout redirect on mount
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    checkoutContextRef.current = { checkoutStatus, sessionId };

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

  useEffect(() => {
    if (!isSignedOut) return;
    if (hasReportedSignedOutRedirectRef.current) return;
    hasReportedSignedOutRedirectRef.current = true;
    router.replace("/sign-in");
  }, [isSignedOut, router]);

  // 2. Emit and surface slow bootstrap states instead of spinning forever
  useEffect(() => {
    if (!bootstrapPhase) return;
    const phaseAtSetup = bootstrapPhase;

    const timer = setTimeout(() => {
      setBootstrapTimeoutPhase((current) => current ?? phaseAtSetup);

      if (reportedBootstrapPhasesRef.current.has(phaseAtSetup)) return;
      reportedBootstrapPhasesRef.current.add(phaseAtSetup);

      const {
        hasUserId,
        isAuthenticated: latestIsAuthenticated,
        isClerkLoaded: latestIsClerkLoaded,
        isConvexAuthLoading: latestIsConvexAuthLoading,
        isVerifying: latestIsVerifying,
      } = readBootstrapTelemetry();

      trackEvent("Subscription Gate Bootstrap Delayed", {
        phase: phaseAtSetup,
        hasUserId,
        isAuthenticated: latestIsAuthenticated,
        isVerifying: latestIsVerifying,
      });

      reportError(new Error("Subscription gate bootstrap timed out"), {
        component: "PaywallGate",
        phase: phaseAtSetup,
        hasUserId,
        isClerkLoaded: latestIsClerkLoaded,
        isConvexAuthLoading: latestIsConvexAuthLoading,
        isAuthenticated: latestIsAuthenticated,
        isVerifying: latestIsVerifying,
      });
    }, BOOTSTRAP_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [bootstrapPhase]);

  // 3. Handle successful subscription activation
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

  // 4. Verification timeout and backup sync logic
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

  useEffect(() => {
    if (!verificationTimeout || subscriptionStatus?.hasAccess) return;
    if (hasReportedVerificationTimeoutRef.current) return;
    hasReportedVerificationTimeoutRef.current = true;
    const { checkoutStatus, sessionId } = checkoutContextRef.current;

    trackEvent("Subscription Gate Checkout Verification Timed Out", {
      hasAccess: Boolean(subscriptionStatus?.hasAccess),
    });
    reportError(new Error("Checkout verification timed out"), {
      component: "PaywallGate",
      checkoutStatus,
      hasAccess: Boolean(subscriptionStatus?.hasAccess),
      sessionIdPresent: Boolean(sessionId),
    });
  }, [subscriptionStatus?.hasAccess, verificationTimeout]);

  // 5. Auto-create user once auth is ready and no record exists
  useEffect(() => {
    if (!authReady || subscriptionStatus !== null) return;
    if (hasAttemptedUserCreationRef.current) return;

    hasAttemptedUserCreationRef.current = true;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    getOrCreateUser({ timezone }).catch((error) => {
      const bootstrapError =
        error instanceof Error
          ? error
          : new Error("Failed to create authenticated user record");

      setUserBootstrapError(bootstrapError);
      trackEvent("Subscription Gate User Bootstrap Failed", {
        error: bootstrapError.message,
      });
      reportError(bootstrapError, {
        component: "PaywallGate",
        operation: "getOrCreateUser",
        timezone,
      });
    });
  }, [authReady, getOrCreateUser, subscriptionStatus]);

  // 6. Redirect to pricing if no access (but not during verification)
  useEffect(() => {
    if (subscriptionStatus === undefined || subscriptionStatus === null) return;
    if (isVerifying) return;
    if (verificationTimeout) return;

    if (!subscriptionStatus.hasAccess) {
      router.replace("/pricing?reason=expired");
    }
  }, [subscriptionStatus, isVerifying, verificationTimeout, router]);

  const renderState = getPaywallRenderState({
    isSignedOut,
    isVerifying,
    verificationTimeout,
    bootstrapTimeoutPhase,
    bootstrapPhase,
    subscriptionStatus,
    userBootstrapError,
  });

  return renderPaywallState(renderState, children);
}
