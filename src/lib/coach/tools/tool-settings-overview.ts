import { api } from "@/../convex/_generated/api";
import { GOAL_LABELS, type GoalType } from "@/lib/goals";
import type { CoachToolContext, ToolResult } from "./types";

type SubscriptionStatus = {
  status: "trial" | "active" | "past_due" | "canceled" | "expired";
  hasAccess: boolean;
  trialDaysRemaining: number;
  subscriptionPeriodEnd: number | null;
};

type BillingInfo = {
  stripeCustomerId: string | null;
  subscriptionStatus: string;
  subscriptionPeriodEnd: number | null;
};

type CurrentUser = {
  preferences?: {
    goals?: GoalType[];
    customGoal?: string;
    trainingSplit?: string;
    coachNotes?: string;
  };
};

function formatGoals(goals: GoalType[] | undefined): string {
  if (!goals || goals.length === 0) return "Not set";
  return goals.map((goal) => GOAL_LABELS[goal]).join(", ");
}

function formatPeriod(periodEnd: number | null): string | undefined {
  if (!periodEnd) return undefined;
  return new Date(periodEnd).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function runSettingsOverviewTool(
  ctx: CoachToolContext
): Promise<ToolResult> {
  const [currentUser, subscriptionStatus, billingInfo] = await Promise.all([
    ctx.convex.query(api.users.getCurrentUser, {}),
    ctx.convex.query(api.users.getSubscriptionStatus, {}),
    ctx.convex.query(api.subscriptions.getBillingInfo, {}),
  ]);

  const user = currentUser as CurrentUser | null;
  const subscription = subscriptionStatus as SubscriptionStatus | null;
  const billing = billingInfo as BillingInfo | null;

  const ctaAction = billing?.stripeCustomerId
    ? "open_billing_portal"
    : "open_checkout";
  const ctaLabel = billing?.stripeCustomerId
    ? "Manage billing"
    : "Upgrade plan";
  const preferencesFields = [
    {
      label: "Goals",
      value: formatGoals(user?.preferences?.goals),
      emphasis: true,
    },
    {
      label: "Custom goal",
      value: user?.preferences?.customGoal || "Not set",
    },
    {
      label: "Training split",
      value: user?.preferences?.trainingSplit || "Not set",
    },
    {
      label: "Coach notes",
      value: user?.preferences?.coachNotes || "Not set",
    },
  ];
  const periodEnd =
    formatPeriod(
      subscription?.subscriptionPeriodEnd ??
        billing?.subscriptionPeriodEnd ??
        null
    ) ?? undefined;
  const subscriptionTitle = "Subscription";
  const subscriptionSubtitle = subscription?.hasAccess
    ? "Your account currently has access."
    : "Upgrade to keep full access.";

  return {
    summary: "Prepared settings overview.",
    blocks: [
      {
        type: "detail_panel",
        title: "Training preferences",
        fields: preferencesFields,
      },
      {
        type: "billing_panel",
        status: subscription?.status ?? "expired",
        title: subscriptionTitle,
        subtitle: subscriptionSubtitle,
        trialDaysRemaining: subscription?.trialDaysRemaining ?? undefined,
        periodEnd,
        ctaLabel,
        ctaAction,
      },
    ],
    outputForModel: {
      status: "ok",
      surface: "settings_overview",
      preferences_title: "Training preferences",
      preferences_fields: preferencesFields.map((field) => ({
        label: field.label,
        value: field.value,
        emphasis: Boolean(field.emphasis),
      })),
      subscription: {
        title: subscriptionTitle,
        subtitle: subscriptionSubtitle,
        status: subscription?.status ?? "expired",
        has_access: subscription?.hasAccess ?? false,
        stripe_customer: Boolean(billing?.stripeCustomerId),
        trial_days_remaining: subscription?.trialDaysRemaining ?? 0,
        period_end: periodEnd ?? null,
        cta_label: ctaLabel,
        cta_action: ctaAction,
      },
      goals: user?.preferences?.goals ?? [],
    },
  };
}
