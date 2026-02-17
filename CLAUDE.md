# CLAUDE

Volume: workout tracker. Log sets fast, see what's working.

## Run & Test

```bash
pnpm dev              # Next.js + Convex together
pnpm test --run       # Tests (single run)
pnpm typecheck && pnpm lint && pnpm build  # Quality checks
```

Lefthook enforces quality gates on commit/push.

## Architecture Map

```
src/app/(app)/page.tsx  →  Dashboard  →  useDashboard hook  →  convex/sets.ts
       (route)            (orchestrator)    (behavior)           (persistence)
                              ↓
                    DashboardMobile / DashboardDesktop
                           (platform views)
```

**Start here:** `convex/schema.ts:1` (data shapes), then `convex/sets.ts:1` (core mutations)

**Three domains:**

- `src/` - React UI, no business logic
- `convex/` - All data mutations, auth checks, subscriptions
- External: Clerk (auth), Stripe (payments), OpenRouter (AI features)

**Deep modules:** `useDashboard`, `useQuickLogForm`, `convex/analytics.ts`

## Deployments

Separate Convex dev/prod deployments. Env vars must be set on both.

```bash
# Dev (automatic)
pnpm convex dev

# Production (manual)
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 pnpm convex deploy -y

# Check prod env vars
./scripts/verify-env.sh --prod-only
```

## Env Vars

**Next.js (Vercel):** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_*_PRICE_ID`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `OPENROUTER_API_KEY`

**Convex (both deployments):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLERK_JWT_ISSUER_DOMAIN`, `OPENROUTER_API_KEY`

## Pitfalls

| Don't                                  | Do                                              |
| -------------------------------------- | ----------------------------------------------- |
| Deploy with uncommitted code           | `git status` clean, then deploy                 |
| Assume code bug on service failure     | Check env vars first: `./scripts/verify-env.sh` |
| Hard-delete exercises                  | Use soft delete (`deleteExercise` mutation)     |
| Skip `includeDeleted` param            | History views need `includeDeleted: true`       |
| Trust Stripe TypeScript types fully    | Docs > types (mode-dependent params)            |
| Re-validate in handler after `v.union` | Convex validates args before handler runs       |
| Use relative imports in `convex/`      | Use `@/lib/...` alias (works in convex too)     |
| Use fake timers in Convex tests        | Prefer time window assertions (before/after)    |

## Key Patterns

- **Security:** Every mutation verifies `ctx.auth.getUserIdentity()` + ownership
- **Soft delete:** Exercises use `deletedAt`; same-name creates auto-restore
- **Subscriptions:** `PaywallGate` + `getSubscriptionStatus` query; Stripe webhooks sync
- **Real-time:** Convex queries auto-subscribe; no manual polling

## Debugging External Services

```bash
# 1. Check config (most common cause)
./scripts/verify-env.sh --prod-only
curl https://volume.fitness/api/health | jq

# 2. Check logs
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 npx convex logs --history 100

# 3. Check dashboards (Stripe webhooks, Clerk logs, Sentry)
```

## References

| Doc                                                          | What                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)                           | System shape, data flow                                     |
| [docs/adr/](docs/adr/)                                       | 7 ADRs: rate limits, soft delete, Stripe, AI, subscriptions |
| [docs/state-diagrams/](docs/state-diagrams/)                 | Checkout, auth, paywall, quick-log flows                    |
| [docs/postmortems/](docs/postmortems/)                       | Incident analyses                                           |
| [GitHub Issues](https://github.com/misty-step/volume/issues) | Planned features                                            |

## Commits

Conventional Commits required. Lefthook validates.

```bash
feat: add exercise selector    # minor bump
fix: restore type safety       # patch bump
```
