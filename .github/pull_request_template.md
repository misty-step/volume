# Pull Request

## Description

<!-- Brief description of changes -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test improvements

## Manual QA Checklist

### Desktop (Chrome/Firefox/Safari)

- [ ] Log a set with exercise + reps + weight
- [ ] Log a bodyweight set (no weight)
- [ ] Use last set "Use" button
- [ ] Delete an exercise
- [ ] Edit an exercise name
- [ ] Toggle kg/lbs
- [ ] View workout history

### Mobile (iOS Safari) - CRITICAL

- [ ] Autofocus works (exercise → reps → weight)
- [ ] Keyboard doesn't hide inputs
- [ ] Delete confirmation works
- [ ] Navigation works smoothly

### Payment/Subscription Changes (if applicable)

- [ ] Test full checkout flow (new user, no Stripe customer)
- [ ] Test with existing subscriber (customer reuse)
- [ ] Verify webhook handling works (check Convex logs)
- [ ] Check Stripe Dashboard for test events
- [ ] Test subscription cancellation/billing portal

### External Integration Deployment (if modifying Stripe, Clerk, OpenRouter, etc.)

- [ ] Verify env vars exist on **production** Convex: `./scripts/verify-env.sh --prod-only`
- [ ] Test against real API (not mocks) in test/sandbox mode
- [ ] Check API documentation for parameter constraints TypeScript can't enforce
- [ ] Verify webhook endpoint is registered and receiving events

## Test Results

- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->
