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

type PreferencesField = {
  label: string;
  value: string;
  emphasis?: boolean;
};

type BillingBlock = {
  type: "billing_panel";
  status: SubscriptionStatus["status"];
  title: string;
  subtitle: string;
  trialDaysRemaining?: number;
  periodEnd?: string;
  ctaLabel: string;
  ctaAction: "open_billing_portal" | "open_checkout";
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

function buildPreferencesFields(user: CurrentUser | null): PreferencesField[] {
  return [
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
}

function getBillingCta(
  billing: BillingInfo | null
): Pick<BillingBlock, "ctaAction" | "ctaLabel"> {
  if (billing?.stripeCustomerId) {
    return {
      ctaAction: "open_billing_portal",
      ctaLabel: "Manage billing",
    };
  }

  return {
    ctaAction: "open_checkout",
    ctaLabel: "Upgrade plan",
  };
}

function getSubscriptionSubtitle(subscription: SubscriptionStatus | null) {
  return subscription?.hasAccess
    ? "Your account currently has access."
    : "Upgrade to keep full access.";
}

export function buildBillingBlock({
  subscription,
  billing,
}: {
  subscription: SubscriptionStatus | null;
  billing: BillingInfo | null;
}): BillingBlock {
  const billingCta = getBillingCta(billing);
  const periodEnd =
    formatPeriod(
      subscription?.subscriptionPeriodEnd ??
        billing?.subscriptionPeriodEnd ??
        null
    ) ?? undefined;

  return {
    type: "billing_panel",
    status: subscription?.status ?? "expired",
    title: "Subscription",
    subtitle: getSubscriptionSubtitle(subscription),
    trialDaysRemaining: subscription?.trialDaysRemaining ?? undefined,
    periodEnd,
    ...billingCta,
  };
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
  const preferencesFields = buildPreferencesFields(user);
  const billingBlock = buildBillingBlock({ subscription, billing });

  return {
    summary: "Prepared settings overview.",
    blocks: [
      {
        type: "detail_panel",
        title: "Training preferences",
        fields: preferencesFields,
      },
      billingBlock,
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
        title: billingBlock.title,
        subtitle: billingBlock.subtitle,
        status: billingBlock.status,
        has_access: subscription?.hasAccess ?? false,
        stripe_customer: Boolean(billing?.stripeCustomerId),
        trial_days_remaining: subscription?.trialDaysRemaining ?? 0,
        period_end: billingBlock.periodEnd ?? null,
        cta_label: billingBlock.ctaLabel,
        cta_action: billingBlock.ctaAction,
      },
      goals: user?.preferences?.goals ?? [],
    },
  };
}
