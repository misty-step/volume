"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { BrutalistButton } from "@/components/brutalist";
import Link from "next/link";

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
    } catch {
      setError("Connection error. Please check your internet and try again.");
      setIsLoading(false);
    }
  };

  // Already subscribed - redirect to app
  useEffect(() => {
    if (subscriptionStatus?.status === "active") {
      router.replace("/today");
    }
  }, [subscriptionStatus?.status, router]);

  // Show nothing while redirecting
  if (subscriptionStatus?.status === "active") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-3 border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold">
            VOLUME
          </Link>
          {user ? (
            <Link href="/today" className="text-sm text-muted-foreground">
              Back to app
            </Link>
          ) : (
            <Link href="/sign-in" className="text-sm text-muted-foreground">
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
            <div className="mb-8 p-4 border-3 border-danger-red bg-danger-red/10 text-center">
              <p className="font-mono text-sm uppercase tracking-wider text-danger-red">
                Your free trial has ended
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Subscribe to continue tracking your workouts
              </p>
            </div>
          )}

          {/* Pricing Card */}
          <div className="border-3 border-border bg-card shadow-[6px_6px_0_0_rgba(0,0,0,0.2)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.4)]">
            {/* Header */}
            <div className="p-6 border-b-3 border-border text-center">
              <h1 className="font-display text-4xl font-bold tracking-wider uppercase">
                GO PRO
              </h1>
              <p className="text-muted-foreground mt-2">
                Everything you need to track your gains
              </p>
            </div>

            {/* Plan Toggle */}
            <div className="p-6 border-b-3 border-border">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPlan("monthly")}
                  className={`flex-1 p-4 border-3 transition-all ${
                    selectedPlan === "monthly"
                      ? "border-danger-red bg-danger-red/10"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="font-mono text-sm uppercase tracking-wider">
                    Monthly
                  </div>
                  <div className="font-display text-3xl font-bold mt-1">
                    ${PRICES.monthly.amount}
                  </div>
                  <div className="text-xs text-muted-foreground">/month</div>
                </button>
                <button
                  onClick={() => setSelectedPlan("annual")}
                  className={`flex-1 p-4 border-3 transition-all relative ${
                    selectedPlan === "annual"
                      ? "border-danger-red bg-danger-red/10"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {PRICES.annual.savings && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-safety-orange text-white text-xs font-mono px-2 py-0.5 uppercase">
                      {PRICES.annual.savings}
                    </div>
                  )}
                  <div className="font-mono text-sm uppercase tracking-wider">
                    Annual
                  </div>
                  <div className="font-display text-3xl font-bold mt-1">
                    ${PRICES.annual.amount}
                  </div>
                  <div className="text-xs text-muted-foreground">/year</div>
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="p-6 border-b-3 border-border">
              <ul className="space-y-3">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-safety-orange flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="p-6">
              <BrutalistButton
                variant="danger"
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
              </BrutalistButton>

              {error && (
                <p className="text-center text-sm text-danger-red mt-3">
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
