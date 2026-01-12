"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Clock } from "lucide-react";
import Link from "next/link";

/**
 * TrialBanner - Shows trial countdown in final days
 *
 * Only displays when:
 * - User is on trial
 * - 5 or fewer days remaining
 */
export function TrialBanner() {
  const subscriptionStatus = useQuery(api.users.getSubscriptionStatus);

  // Don't show if loading or no subscription data
  if (!subscriptionStatus) return null;

  // Don't show if not on trial
  if (subscriptionStatus.status !== "trial") return null;

  // Only show in final 5 days
  const daysLeft = subscriptionStatus.trialDaysRemaining;
  if (daysLeft > 5) return null;

  const urgency = daysLeft <= 1 ? "bg-red-500" : "bg-amber-500";
  const message =
    daysLeft === 0
      ? "Trial ends today"
      : daysLeft === 1
        ? "1 day left in trial"
        : `${daysLeft} days left in trial`;

  return (
    <div
      className={`${urgency} text-white px-4 py-2 text-center text-sm font-medium`}
    >
      <div className="flex items-center justify-center gap-2">
        <Clock className="h-4 w-4" />
        <span>{message}</span>
        <Link href="/pricing" className="underline hover:no-underline ml-2">
          Subscribe now
        </Link>
      </div>
    </div>
  );
}
