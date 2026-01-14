# Checkout Flow State Machine

User journey from pricing page to active subscription.

## States

| State | UI | Next |
|-------|----|----|
| `idle` | Plan selection visible | loading |
| `loading` | Spinner, button disabled | redirecting, error |
| `redirecting` | Window navigating to Stripe | (external) |
| `error` | Error message shown | idle (retry) |
| `success` | Redirect to `/today?checkout=success` | - |

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> idle: Page load

    idle --> loading: Click "Subscribe"
    idle --> signUp: Not authenticated

    signUp --> idle: Returns from sign-up

    loading --> redirecting: API returns URL
    loading --> error: API error
    loading --> error: Network failure
    loading --> error: Missing price config

    error --> idle: User acknowledges

    redirecting --> [*]: Stripe handles payment

    note right of redirecting
        User leaves app.
        Stripe webhook updates
        subscription status.
    end note
```

## Checkout API Flow

```mermaid
sequenceDiagram
    participant UI as Pricing Page
    participant API as /api/stripe/checkout
    participant Convex
    participant Stripe

    UI->>API: POST { priceId }
    API->>API: Verify Clerk auth
    API->>Convex: Get existing stripeCustomerId
    API->>Stripe: Create checkout session
    Stripe-->>API: Session URL
    API-->>UI: { url }
    UI->>Stripe: window.location = url

    Note over Stripe: User completes payment

    Stripe->>Convex: Webhook: checkout.session.completed
    Convex->>Convex: Update subscription status
```

## Error States

| Error | User Message | Recovery |
|-------|--------------|----------|
| Missing priceId | "Payment configuration error" | Retry later |
| API 500 | "Something went wrong" | Retry |
| Network error | "Connection error" | Check internet |

## IDOR Prevention

The checkout API fetches `stripeCustomerId` server-side from Convex using the authenticated user's token, preventing attackers from using another user's Stripe customer ID.

## Files

- `/src/app/pricing/page.tsx` - Checkout UI and state management
- `/src/app/api/stripe/checkout/route.ts` - Checkout session creation
- `/convex/subscriptions.ts` - `getStripeCustomerId` query
