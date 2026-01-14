# ADR-0003: Stripe Webhooks via Convex HTTP Layer

Date: 2026-01-13
Status: accepted

## Context and Problem Statement

Stripe subscription events must be processed reliably to keep user subscription status in sync. The system needs to choose where to handle webhooks: Next.js API routes, Convex HTTP handlers, or a separate microservice.

Key requirements:
- Atomic database updates (subscription status must match Stripe)
- Webhook signature verification (security)
- Retry semantics (Stripe retries failed webhooks)
- Minimal latency (user should see status update quickly)

## Considered Options

### Option 1: Next.js API routes (not chosen)

- Pros: Familiar pattern; collocated with checkout routes.
- Cons: Cannot atomically update Convex; requires separate HTTP client call; adds latency; error handling complexity.

### Option 2: Convex HTTP handler (chosen)

- Pros: Direct database access via `ctx.runMutation`; atomic updates; built-in retries via Stripe semantics.
- Cons: Different runtime constraints; must use `constructEventAsync` (no Node.js timers in Convex).

### Option 3: Separate webhook microservice (not chosen)

- Pros: Dedicated scaling; isolation from main app.
- Cons: New infrastructure; operational overhead; overkill for current scale.

## Decision Outcome

**Chosen**: Option 2 — Stripe webhooks handled in Convex HTTP layer (`convex/http.ts`) with direct database mutation access.

### Why Convex HTTP?

The critical insight: webhook handlers need to atomically update subscription status in the database. With Next.js API routes, we'd need to:
1. Receive webhook
2. Verify signature
3. Make HTTP call to Convex mutation
4. Handle potential failure between steps 2-3

With Convex HTTP, verification and mutation happen in the same atomic context.

### Key Implementation Details

**SubtleCrypto Provider**: Convex runtime doesn't support Node.js timers, so Stripe SDK's default signature verification fails. Solution:

```typescript
event = await stripe.webhooks.constructEventAsync(
  body,
  signature,
  webhookSecret,
  undefined,
  Stripe.createSubtleCryptoProvider() // Web Crypto API
);
```

**Error Handling for Retries**: Processing errors return 500 to trigger Stripe retry:

```typescript
catch (err) {
  console.error("Error processing webhook:", { eventType, eventId, error });
  return new Response(`Webhook processing failed: ${message}`, { status: 500 });
}
```

**Atomic Checkout Completion**: `handleCheckoutCompleted` links Stripe customer ID and activates subscription in single mutation to avoid race conditions.

### Consequences

**Good**
- Atomic database updates (no partial states)
- Stripe retry semantics work naturally (500 = retry, 200 = done)
- No additional infrastructure required
- Minimal latency (Convex is already our backend)

**Bad**
- Must remember Convex runtime constraints (no Node timers)
- Webhook secret must be in Convex environment, not just Vercel

**Neutral**
- Webhook endpoint format: `https://<convex-url>/stripe/webhook`
- Different from typical Next.js patterns (learning curve)

## Implementation Notes

- Entry point: `convex/http.ts`
- Mutations: `convex/subscriptions.ts` (internal mutations for webhook handlers)
- Environment: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Convex env
- Events handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

## References

- convex/http.ts (webhook handler)
- convex/subscriptions.ts (internal mutations)
- Stripe Docs: Webhooks with SubtleCrypto
