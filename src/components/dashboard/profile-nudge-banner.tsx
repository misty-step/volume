"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { Loader2, Sparkles, X } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { handleMutationError } from "@/lib/error-handler";

const DISMISSAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

type ProfileNudgeUser = (Doc<"users"> & { isProfileComplete?: boolean }) | null;

interface ProfileNudgeBannerProps {
  user?: ProfileNudgeUser;
  className?: string;
}

export function ProfileNudgeBanner({
  user,
  className,
}: ProfileNudgeBannerProps) {
  const dismissOnboardingNudge = useMutation(api.users.dismissOnboardingNudge);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const shouldShow = useMemo(() => {
    if (!user || user.isProfileComplete) return false;
    const dismissedAt = user.onboardingDismissedAt;
    if (dismissedAt === undefined) return true;
    return Date.now() - dismissedAt > DISMISSAL_WINDOW_MS;
  }, [user]);

  if (!shouldShow || isDismissed) return null;

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await dismissOnboardingNudge({});
      setIsDismissed(true);
    } catch (error) {
      handleMutationError(error, "Dismiss Onboarding Nudge");
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full border-3 border-concrete-black dark:border-concrete-white",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "p-4 mb-4",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-danger-red mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-display uppercase tracking-wide">
              Complete your profile
            </p>
            <p className="text-xs text-muted-foreground">
              Set goals, split, and notes to personalize your training.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings">Go to settings</Link>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            disabled={isDismissing}
            aria-label="Dismiss profile nudge"
          >
            {isDismissing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
