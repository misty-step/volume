"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { reportError } from "@/lib/analytics";

const PRICES = {
  monthly: {
    id: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ?? "",
    amount: 8,
    interval: "month" as const,
    label: "Monthly",
  },
  annual: {
    id: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID ?? "",
    amount: 70,
    interval: "year" as const,
    label: "Annual",
    savings: "Save $26/year",
  },
};

const FEATURES = [
  "Unlimited exercises",
  "Full workout history",
  "AI weekly reports",
  "Progressive overload tracking",
  "Recovery insights",
  "CSV data export",
];

function PricingContent() {
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const subscriptionStatus = useQuery(
    api.users.getSubscriptionStatus,
    user ? {} : "skip"
  );

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(
    "annual"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!user) {
      router.push("/sign-up");
      return;
    }

    // Validate price ID is configured
    const priceId = PRICES[selectedPlan].id;
    if (!priceId) {
      setError("Payment configuration error. Please try again later.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        reportError(new Error("Checkout request failed"), {
          context: "pricing/checkout",
          status: response.status,
          plan: selectedPlan,
        });
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Checkout request failed");
      reportError(err, { context: "pricing/checkout", plan: selectedPlan });
      setError("Connection error. Please check your internet and try again.");
      setIsLoading(false);
    }
  };

  // Already subscribed - redirect to app
  useEffect(() => {
    if (
      subscriptionStatus?.hasAccess &&
      subscriptionStatus.status !== "trial"
    ) {
      router.replace("/today");
    }
  }, [subscriptionStatus?.hasAccess, subscriptionStatus?.status, router]);

  // Show nothing while redirecting
  if (subscriptionStatus?.hasAccess && subscriptionStatus.status !== "trial") {
    return null;
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border-subtle p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Volume
          </Link>
          {user ? (
            <Link
              href="/today"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to app
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-xl w-full">
          {/* Trial Expired Message */}
          {reason === "expired" && (
            <div className="mb-8 rounded-[--radius] p-4 border border-destructive/50 bg-destructive/10 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-destructive">
                Your free trial has ended
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Subscribe to continue tracking your workouts
              </p>
            </div>
          )}

          {/* Pricing Card */}
          <div className="rounded-[--radius] border border-border-subtle bg-card">
            {/* Header */}
            <div className="p-6 border-b border-border-subtle text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                GO PRO
              </h1>
              <p className="text-muted-foreground mt-2">
                Everything you need to track your gains
              </p>
            </div>

            {/* Plan Toggle */}
            <div className="p-6 border-b border-border-subtle">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPlan("monthly")}
                  className={`flex-1 rounded-[--radius] p-4 border transition-all ${
                    selectedPlan === "monthly"
                      ? "border-accent bg-accent/10"
                      : "border-border-subtle hover:border-border"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Monthly
                  </div>
                  <div className="text-3xl font-bold mt-1 text-foreground">
                    ${PRICES.monthly.amount}
                  </div>
                  <div className="text-xs text-muted-foreground">/month</div>
                </button>
                <button
                  onClick={() => setSelectedPlan("annual")}
                  className={`relative flex-1 rounded-[--radius] p-4 border transition-all ${
                    selectedPlan === "annual"
                      ? "border-accent bg-accent/10"
                      : "border-border-subtle hover:border-border"
                  }`}
                >
                  {PRICES.annual.savings && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[calc(var(--radius)-4px)] bg-accent px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-accent-foreground">
                      {PRICES.annual.savings}
                    </div>
                  )}
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Annual
                  </div>
                  <div className="text-3xl font-bold mt-1 text-foreground">
                    ${PRICES.annual.amount}
                  </div>
                  <div className="text-xs text-muted-foreground">/year</div>
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="p-6 border-b border-border-subtle">
              <ul className="space-y-3">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="p-6">
              <Button
                variant="destructive"
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={isLoading || !userLoaded}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    {user ? "Subscribe Now" : "Start Free Trial"}
                  </>
                )}
              </Button>

              {error && (
                <p className="text-center text-sm text-destructive mt-3">
                  {error}
                </p>
              )}

              {!user && (
                <p className="text-center text-xs text-muted-foreground mt-4">
                  14-day free trial. No credit card required.
                </p>
              )}
            </div>
          </div>

          {/* Trust signals */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>Cancel anytime. Secure payment via Stripe.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
