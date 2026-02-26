import { api } from "@/../convex/_generated/api";
import { GOAL_LABELS, type GoalType } from "@/lib/goals";
import { uniquePrompts } from "./helpers";
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

  return {
    summary: "Prepared settings overview.",
    blocks: [
      {
        type: "detail_panel",
        title: "Training preferences",
        fields: [
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
        ],
      },
      {
        type: "billing_panel",
        status: subscription?.status ?? "expired",
        title: "Subscription",
        subtitle: subscription?.hasAccess
          ? "Your account currently has access."
          : "Upgrade to keep full access.",
        trialDaysRemaining: subscription?.trialDaysRemaining ?? undefined,
        periodEnd:
          formatPeriod(
            subscription?.subscriptionPeriodEnd ??
              billing?.subscriptionPeriodEnd ??
              null
          ) ?? undefined,
        ctaLabel,
        ctaAction,
      },
      {
        type: "suggestions",
        prompts: uniquePrompts([
          "update goals to build_muscle and get_stronger",
          "set training split to push pull legs",
          "set coach notes to prioritize shoulder stability",
          "show analytics overview",
        ]),
      },
    ],
    outputForModel: {
      status: "ok",
      subscription_status: subscription?.status ?? "expired",
      has_access: subscription?.hasAccess ?? false,
      stripe_customer: Boolean(billing?.stripeCustomerId),
      goals: user?.preferences?.goals ?? [],
    },
  };
}
