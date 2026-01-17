# Postmortem: Stripe Production Integration Failure

**Date:** 2026-01-16
**Severity:** High (payment flow broken for all users)
**Duration:** ~1-2 hours (from first user report to fix)
**Author:** Claude Code + phaedrus

## Incident Summary

Stripe subscription checkout was failing in production with two distinct issues:
1. Checkout session creation rejected by Stripe API (`customer_creation` invalid in subscription mode)
2. Successfully paid users weren't seeing their subscriptions activated (webhooks failing silently)

## Timeline

| Time (CST) | Event |
|------------|-------|
| ~14:53 | Stripe subscription feature merged (`3fc90c5`) |
| ~21:00 | User reports "subscribe button" errors in production |
| ~21:07 | Vercel logs show `customer_creation` Stripe API error |
| 15:24 | `customer_creation` fix committed (`23113a0`) |
| 15:54 | Race condition fix committed (`c77612b`) - built for wrong diagnosis |
| ~16:00 | **Actual root cause discovered**: Stripe env vars not set on production Convex |
| ~16:00 | Env vars set on production, user subscription synced manually |

## Root Cause

**The Stripe environment variables (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) were never set on the production Convex deployment** - they only existed on dev.

The initial debugging session chased two red herrings before finding this:

1. **The `customer_creation` Stripe API error** - A real bug (Stripe rejects this param in subscription mode), but fixing it didn't resolve the main issue
2. **A hypothetical webhook race condition** - ~400 lines of backup sync logic built to handle webhook delays that weren't happening

The webhooks weren't delayed; they were **failing entirely** because `process.env.STRIPE_WEBHOOK_SECRET` was undefined.

### Evidence

From Convex production logs:
```
[ERROR] 'Missing Stripe configuration'
```

Webhook endpoint was returning 500 errors, causing Stripe to queue retries indefinitely.

## 5 Whys Analysis

1. **Why did subscriptions not activate after payment?**
   → Stripe webhooks failed with 500 errors, never updating Convex

2. **Why did webhooks fail?**
   → `process.env.STRIPE_WEBHOOK_SECRET` was undefined in production

3. **Why was it undefined?**
   → Env vars were only set on dev Convex deployment, not prod

4. **Why weren't they set on prod?**
   → `npx convex env set` ran without explicit `CONVEX_DEPLOYMENT=prod:...` prefix

5. **Why wasn't this caught before users hit it?**
   → No production smoke test of checkout flow; dev testing used dev Convex with working env vars

## Contributing Factors

- [x] **Manual env var setup** - easy to forget deployment targeting
- [x] **Separate dev/prod deployments** - env vars must be set twice
- [x] **No production integration test** - checkout flow never tested against prod Convex + live Stripe
- [x] **Debugging under pressure** - jumped to code fixes before checking infrastructure
- [x] **TypeScript type blindness** - Stripe SDK types don't enforce mode-dependent parameter constraints

## Fixes Applied

| Fix | Commit | Lines Changed | Necessary? |
|-----|--------|---------------|------------|
| Set env vars on prod Convex | (config) | 0 | **Yes** - root cause |
| Remove `customer_creation` param | `23113a0` | +228 | **Yes** - Stripe API error |
| Add race condition handling | `c77612b` | +366 | **Probably not** - built for wrong diagnosis |

### Assessment of Race Condition Fix

The `c77612b` commit added sophisticated backup sync logic:
- Session ID in success URL for targeted sync
- `convex/stripe.ts` with backup sync action
- PaywallGate "reactive wait with active fallback" pattern
- 4-second webhook wait, 10-second hard timeout

This is well-engineered code, but it was built to solve a problem that didn't exist. The webhooks weren't slow; they were failing due to missing config. We're keeping it (defense in depth), but it represents ~400 lines of complexity that may never execute in practice.

## Mitigation Plan

### Preventive Measures

| Action | Owner | Status |
|--------|-------|--------|
| Create `scripts/verify-prod-env.sh` for deployment checks | - | Implemented |
| Add Lefthook pre-push hook for production deploys | - | Implemented |
| Document required env vars in CLAUDE.md | - | Implemented |

### Detection Improvements

| Action | Owner | Status |
|--------|-------|--------|
| Enhance `/api/health` to verify Stripe config | - | Implemented |
| Add structured logging for webhook failures | - | Implemented |

### Process Changes

| Action | Owner | Status |
|--------|-------|--------|
| Add "Third-Party API Integration Checklist" to CLAUDE.md | - | Implemented |
| Update PR template with external integration section | - | Implemented |
| Add debugging decision tree: check config before code | - | Documented |

## Lessons Learned

### 1. Check Config Before Code

When external services fail, verify configuration (env vars, secrets, endpoints) **before** assuming code bugs. The debugging session spent significant time on code analysis when a simple `convex env list` on prod would have revealed the issue immediately.

**Heuristic:** For any 500 error from an external integration, first run:
```bash
CONVEX_DEPLOYMENT=prod:... npx convex env list | grep <SERVICE>
```

### 2. Over-Engineering Under Pressure

The race condition fix was technically elegant but solved the wrong problem. Under time pressure, there's a temptation to build sophisticated solutions. The simpler path would have been:

1. Check if env vars are set
2. Set them
3. Verify webhook works
4. Only then consider code changes

### 3. Dev ≠ Prod is a Footgun

Separate Convex deployments provide safety but require discipline:
- Every `npx convex env set` needs a deployment target
- Dev success doesn't guarantee prod success
- Integration tests should run against prod-like config

### 4. TypeScript Types Are Necessary But Not Sufficient

The `customer_creation` bug reveals that TypeScript types can't encode all API constraints. Stripe's SDK types allow `customer_creation` in subscription mode, but the API rejects it. This class of bug requires:
- Reading API documentation carefully
- Testing with real API (not mocks) in sandbox mode
- Adding unit tests that verify parameter shapes

## Related Documents

- [ADR-0003: Stripe Webhook via Convex HTTP](../adr/ADR-0003-stripe-webhook-convex-http.md)
- [ADR-0006: Subscription State Machine](../adr/ADR-0006-subscription-state-machine.md)
- [Checkout Flow State Diagram](../state-diagrams/checkout-flow.md)

## Appendix: Commands Used in Debugging

```bash
# Check production Convex logs
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 npx convex logs --history 100

# List production env vars
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 npx convex env list

# Set production env var
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 npx convex env set STRIPE_SECRET_KEY "sk_live_..."

# Check Stripe webhook deliveries
stripe events list --limit 10

# Test webhook endpoint manually
curl -X POST https://whimsical-marten-631.convex.site/stripe/webhook
```
