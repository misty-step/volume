# ADR-0006: Subscription State Machine Design

Date: 2026-01-13
Status: accepted

## Context and Problem Statement

Volume uses a freemium model with 14-day free trial. After trial, users must subscribe to continue. The system needs to track subscription state and enforce access control.

Challenges:
- Multiple valid states (trial, active, past_due, canceled, expired)
- Stripe's status semantics differ from ours (Stripe "canceled" = won't renew but still paid)
- Access logic depends on both status AND period end date
- User records may not exist when webhook fires (race condition)

## Considered Options

### Option 1: Boolean flags (not chosen)

- Pros: Simple schema (hasAccess: boolean).
- Cons: Loses state information; can't distinguish trial from active; can't show "canceled but access until X."

### Option 2: Status enum with period dates (chosen)

- Pros: Clear state machine; Stripe semantics preserved; rich UI messaging.
- Cons: Access logic requires combining status + dates; more complex hasAccess calculation.

### Option 3: Store raw Stripe status (not chosen)

- Pros: No mapping logic; always matches Stripe.
- Cons: Stripe has 8+ statuses; frontend complexity; harder to reason about access.

## Decision Outcome

**Chosen**: Option 2 — Custom status enum with explicit access calculation logic.

### State Definitions

```typescript
subscriptionStatus: v.union(
  v.literal("trial"),     // Within 14-day free trial
  v.literal("active"),    // Paid and current
  v.literal("past_due"),  // Payment failed, grace period
  v.literal("canceled"),  // Will not renew, but still has access until periodEnd
  v.literal("expired")    // No access, trial ended or subscription terminated
)
```

### Stripe Status Mapping

Stripe's "canceled" means "won't renew but paid through period." We preserve this nuance:

```typescript
function mapStripeStatus(subscription: Stripe.Subscription) {
  // User clicked "cancel" but still paid
  if (subscription.cancel_at_period_end) {
    return "canceled";
  }
  // Map Stripe statuses
  switch (subscription.status) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due": return "past_due";
    default: return "canceled";  // unpaid, incomplete, etc.
  }
}
```

### Access Calculation

Access is not a simple status check. It combines status and dates:

```typescript
const hasAccess =
  status === "active" ||
  status === "past_due" ||                           // Grace period
  (status === "trial" && trialEndsAt > now) ||       // Valid trial
  (status === "canceled" && periodEnd > now);        // Paid through period
```

This enables messaging like "Your subscription ends Jan 31" instead of abrupt "No access."

### PaywallGate Pattern

The `PaywallGate` component wraps protected routes and handles edge cases:

```typescript
// Auto-create user with trial if no record exists
if (subscriptionStatus === null && !userCreationAttempted.current) {
  getOrCreateUser({ timezone });
  return;
}

// Redirect if no access
if (subscriptionStatus && !subscriptionStatus.hasAccess) {
  router.replace("/pricing?reason=expired");
}
```

### IDOR Prevention

Checkout route fetches `stripeCustomerId` server-side to prevent attackers from specifying someone else's customer ID:

```typescript
// Server-side fetch, not from request body
const billingInfo = await convex.query(api.subscriptions.getBillingInfo);
stripeCustomerId = billingInfo?.stripeCustomerId;
```

### Consequences

**Good**
- Clear state machine with defined transitions
- Rich UI messaging (days remaining, period end date)
- Stripe semantics preserved (canceled =/= no access)
- IDOR-resistant checkout flow

**Bad**
- Access logic requires understanding combined status+date semantics
- Must keep Stripe status mapping updated if Stripe adds new statuses

**Neutral**
- `past_due` included to allow grace period (could be policy decision)
- Trial period (14 days) is hardcoded constant

## Implementation Notes

- Schema: `convex/schema.ts` (users table subscription fields)
- State queries: `convex/users.ts` (getSubscriptionStatus)
- Stripe mapping: `convex/http.ts` (mapStripeStatus function)
- Access gate: `src/components/subscription/paywall-gate.tsx`
- Checkout: `src/app/api/stripe/checkout/route.ts`

## References

- convex/users.ts (getSubscriptionStatus query)
- convex/http.ts (Stripe webhook handling)
- src/components/subscription/paywall-gate.tsx (access enforcement)
