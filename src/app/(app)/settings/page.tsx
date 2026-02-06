"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { ExerciseManager } from "@/components/dashboard/exercise-manager";
import { InlineExerciseCreator } from "@/components/dashboard/inline-exercise-creator";
import { CoachNotesForm } from "@/components/settings/coach-notes-form";
import { GoalsForm } from "@/components/settings/goals-form";
import { SettingsSection } from "@/components/ui/settings-section";
import { SettingsList } from "@/components/ui/settings-list";
import { SettingsListItem } from "@/components/ui/settings-list-item";
import { Button } from "@/components/ui/button";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { useTactileSoundPreference } from "@/hooks/useTactileSoundPreference";
import { PageLayout } from "@/components/layout/page-layout";
import { Plus, ExternalLink, Mail, CreditCard, Loader2 } from "lucide-react";
import { clientVersion } from "@/lib/version";

/** Format subscription status for display */
function formatPlanSubtitle(
  sub:
    | {
        status?: string;
        subscriptionPeriodEnd?: number | null;
        trialDaysRemaining?: number;
      }
    | null
    | undefined
): string {
  if (!sub) return "Loading...";
  const { status, subscriptionPeriodEnd, trialDaysRemaining } = sub;
  const formatDate = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  if (status === "active" && subscriptionPeriodEnd) {
    return `Pro (renews ${formatDate(subscriptionPeriodEnd)})`;
  }
  if (
    status === "canceled" &&
    subscriptionPeriodEnd &&
    subscriptionPeriodEnd > Date.now()
  ) {
    return `Pro (access until ${formatDate(subscriptionPeriodEnd)})`;
  }
  if (status === "trial") return `Trial (${trialDaysRemaining ?? 0} days left)`;
  if (status === "past_due") return "Pro (payment past due)";
  return "Expired";
}

export default function SettingsPage() {
  const router = useRouter();
  const [showCreator, setShowCreator] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Fetch exercises and sets for ExerciseManager (active only)
  const exercises = useQuery(api.exercises.listExercises, {
    includeDeleted: false,
  });
  const sets = useQuery(api.sets.listSets, {});

  // Subscription data
  const billingInfo = useQuery(api.subscriptions.getBillingInfo);
  const subscriptionStatus = useQuery(api.users.getSubscriptionStatus);
  const currentUser = useQuery(api.users.getCurrentUser);

  // Weight unit preference
  const { unit, setUnit } = useWeightUnit();

  // Tactile sound preference
  const { soundEnabled, setSoundEnabled } = useTactileSoundPreference();

  const handleManageBilling = async () => {
    if (!billingInfo?.stripeCustomerId) return;

    setBillingLoading(true);
    setBillingError(null);
    try {
      // stripeCustomerId fetched server-side from authenticated user
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Portal error:", data.error);
        setBillingError("Unable to open billing portal. Try again.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      setBillingError("Unable to open billing portal. Try again.");
    } finally {
      setBillingLoading(false);
    }
  };

  // Loading state - Brutalist skeleton
  if (exercises === undefined || sets === undefined) {
    return (
      <PageLayout title="Settings">
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-4 bg-concrete-gray w-32 animate-pulse font-mono" />
              <div className="border-3 border-border p-4 space-y-3">
                <div className="h-10 bg-concrete-gray/20 animate-pulse" />
                <div className="h-10 bg-concrete-gray/20 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Settings">
      {/* Exercise Management Section */}
      <SettingsSection title="EXERCISE MANAGEMENT">
        <SettingsList>
          {/* Add Exercise Action */}
          {!showCreator ? (
            <SettingsListItem
              title="Add Exercise"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setShowCreator(true)}
            />
          ) : (
            <div className="p-4">
              <InlineExerciseCreator
                onCreated={() => setShowCreator(false)}
                onCancel={() => setShowCreator(false)}
              />
            </div>
          )}
        </SettingsList>
      </SettingsSection>

      {/* Exercise Registry Section */}
      {exercises.length > 0 && (
        <SettingsSection title={`EXERCISE REGISTRY (${exercises.length})`}>
          <ExerciseManager exercises={exercises} sets={sets} />
        </SettingsSection>
      )}

      {/* Preferences Section */}
      <SettingsSection title="PREFERENCES">
        <SettingsList>
          <SettingsListItem
            title="Weight Unit"
            subtitle="Default unit for logging weights"
            actions={
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={unit === "lbs" ? "default" : "outline"}
                  onClick={() => setUnit("lbs")}
                >
                  lbs
                </Button>
                <Button
                  size="sm"
                  variant={unit === "kg" ? "default" : "outline"}
                  onClick={() => setUnit("kg")}
                >
                  kg
                </Button>
              </div>
            }
          />
          <SettingsListItem
            title="Tactile Sounds"
            subtitle="Play click sound on button presses"
            actions={
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={soundEnabled ? "default" : "outline"}
                  onClick={() => setSoundEnabled(true)}
                >
                  On
                </Button>
                <Button
                  size="sm"
                  variant={!soundEnabled ? "default" : "outline"}
                  onClick={() => setSoundEnabled(false)}
                >
                  Off
                </Button>
              </div>
            }
          />
        </SettingsList>
      </SettingsSection>

      {/* Goals & Coaching Section */}
      <SettingsSection title="GOALS & COACHING">
        <div className="space-y-4">
          <GoalsForm user={currentUser} />
          <CoachNotesForm user={currentUser} />
        </div>
      </SettingsSection>

      {/* Subscription Section */}
      <SettingsSection title="SUBSCRIPTION">
        <SettingsList>
          <SettingsListItem
            title="Plan"
            subtitle={formatPlanSubtitle(subscriptionStatus)}
            actions={
              billingInfo?.stripeCustomerId ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                >
                  {billingLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-1" />
                      Manage
                    </>
                  )}
                </Button>
              ) : subscriptionStatus?.status === "trial" ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => router.push("/pricing")}
                >
                  Upgrade
                </Button>
              ) : null
            }
          />
        </SettingsList>
        {billingError && (
          <p className="px-4 pt-2 text-xs text-danger-red">{billingError}</p>
        )}
      </SettingsSection>

      {/* About Section */}
      <SettingsSection title="ABOUT">
        <SettingsList>
          <SettingsListItem
            title="Volume"
            subtitle={`Version ${clientVersion}`}
            actions={
              <a
                href={`/releases/${clientVersion}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Release Notes
              </a>
            }
          />
          <SettingsListItem
            title="A Misty Step Project"
            icon={<ExternalLink className="w-4 h-4" />}
            onClick={() =>
              window.open(
                "https://mistystep.io",
                "_blank",
                "noopener,noreferrer"
              )
            }
          />
          <SettingsListItem
            title="Feedback & Support"
            icon={<Mail className="w-4 h-4" />}
            onClick={() => {
              window.location.href = "mailto:hello@mistystep.io";
            }}
          />
        </SettingsList>
      </SettingsSection>
    </PageLayout>
  );
}
