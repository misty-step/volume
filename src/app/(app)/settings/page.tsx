"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { ExerciseManager } from "@/components/dashboard/exercise-manager";
import { InlineExerciseCreator } from "@/components/dashboard/inline-exercise-creator";
import { SettingsSection } from "@/components/ui/settings-section";
import { SettingsList } from "@/components/ui/settings-list";
import { SettingsListItem } from "@/components/ui/settings-list-item";
import { Button } from "@/components/ui/button";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { PageLayout } from "@/components/layout/page-layout";
import { Plus, ExternalLink, Mail, CreditCard, Loader2 } from "lucide-react";
import { clientVersion } from "@/lib/version";

export default function SettingsPage() {
  const router = useRouter();
  const [showCreator, setShowCreator] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  // Fetch exercises and sets for ExerciseManager (active only)
  const exercises = useQuery(api.exercises.listExercises, {
    includeDeleted: false,
  });
  const sets = useQuery(api.sets.listSets, {});

  // Subscription data
  const billingInfo = useQuery(api.subscriptions.getBillingInfo);
  const subscriptionStatus = useQuery(api.users.getSubscriptionStatus);

  // Weight unit preference
  const { unit, setUnit } = useWeightUnit();

  const handleManageBilling = async () => {
    if (!billingInfo?.stripeCustomerId) return;

    setBillingLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripeCustomerId: billingInfo.stripeCustomerId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Portal error:", data.error);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
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
        </SettingsList>
      </SettingsSection>

      {/* Subscription Section */}
      <SettingsSection title="SUBSCRIPTION">
        <SettingsList>
          <SettingsListItem
            title="Plan"
            subtitle={
              subscriptionStatus?.status === "active"
                ? "Pro"
                : subscriptionStatus?.status === "trial"
                  ? `Trial (${subscriptionStatus.trialDaysRemaining} days left)`
                  : "Expired"
            }
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
      </SettingsSection>

      {/* About Section */}
      <SettingsSection title="ABOUT">
        <SettingsList>
          <SettingsListItem
            title="Volume"
            subtitle={`Version ${clientVersion}`}
          />
          <SettingsListItem
            title="A Misty Step Project"
            icon={<ExternalLink className="w-4 h-4" />}
            onClick={() => {
              const link = document.createElement("a");
              link.href = "https://mistystep.io";
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              link.click();
            }}
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
