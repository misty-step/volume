# CLAUDE

Volume: workout tracker. Log sets fast, see what's working.

## Run & Test

```bash
bun run setup:check   # Validate required local tooling with no file changes
bun run setup         # Install deps + create .env.local if needed
bunx convex dev       # Provision/sync your personal Convex dev deployment
bun run dev           # Next.js + Convex + local Stripe forwarding
bun run test --run    # Tests (single run)
bun run security:audit # High-severity dependency vulnerabilities
bun run typecheck && bun run lint && bun run build  # Quality checks
dagger call check --source .                       # Full CI locally (Docker required)
```

Lefthook enforces quality gates on commit/push.

## Bootstrap

Canonical order: `bun run setup` -> `bunx convex dev` -> `bun run dev`.

Required for the core local app flow:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`

One-time bootstrap steps:

1. Run `bun run setup` to install deps and create `.env.local` when missing.
2. Fill in the Clerk values above in `.env.local`.
3. Run `bunx convex dev` once. This refreshes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`.
4. Sync Clerk into Convex:
   `bunx convex env set CLERK_JWT_ISSUER_DOMAIN "https://<your-dev>.clerk.accounts.dev"`
5. Start the app with `bun run dev`.

Optional full-feature parity:

- Add `OPENROUTER_API_KEY` to `.env.local` and sync it into Convex with
  `bunx convex env set OPENROUTER_API_KEY "sk-or-..."` for coach features and `/api/health`.
- Add `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`, and
  `NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID` to `.env.local` for billing flows.
- Install Stripe CLI and run `stripe login` if you want webhook forwarding during local `bun run dev`.

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
bun run dev:convex

# Production (manual)
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex deploy -y

# Check prod env vars
./scripts/verify-env.sh --prod-only
```

## Env Vars

**Next.js (Vercel):** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_*_PRICE_ID`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CANARY_ENDPOINT`, `NEXT_PUBLIC_CANARY_API_KEY`, `CANARY_ENDPOINT`, `CANARY_API_KEY`, `OPENROUTER_API_KEY`

**Convex (both deployments):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLERK_JWT_ISSUER_DOMAIN`, `OPENROUTER_API_KEY`

## Pitfalls

| Don't                                            | Do                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Deploy with uncommitted code                     | `git status` clean, then deploy                                                                 |
| Assume code bug on service failure               | Check env vars first: `./scripts/verify-env.sh`                                                 |
| Hard-delete exercises                            | Use soft delete (`deleteExercise` mutation)                                                     |
| Skip `includeDeleted` param                      | History views need `includeDeleted: true`                                                       |
| Trust Stripe TypeScript types fully              | Docs > types (mode-dependent params)                                                            |
| Re-validate in handler after `v.union`           | Convex validates args before handler runs                                                       |
| Use relative imports in `convex/`                | Use `@/lib/...` alias (works in convex too)                                                     |
| Use fake timers in Convex tests                  | Prefer time window assertions (before/after)                                                    |
| Read server-only env in `.client` code           | Keep browser-only env reads in `.client` files and limit them to `NEXT_PUBLIC_*` or `NODE_ENV`  |
| Inline error blocks in tool handlers             | Use `exerciseNotFoundResult()` from `helpers.ts` for all exercise-not-found errors              |
| Call `get_exercise_library` to disambiguate      | Use `close_matches` from tool error output — prompt handles the rest                            |
| Use `console.error`/`console.warn` in API routes | Use `createChildLogger({ route })` from `@/lib/logger` — PII-sanitized, structured JSON in prod |
| Leave `catch {}` blocks empty                    | Always log or report — `log.warn(msg, ctx)` for expected failures, `reportError` for unexpected |
| Use `@/lib/logger` in Convex runtime             | Use `console.warn` — Convex can't import Next.js modules                                        |

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
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex logs --history 100

# 3. Check dashboards (Stripe webhooks, Clerk logs, Canary)
```

## References

| Doc                                                          | What                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)                           | System shape, data flow                                     |
| [docs/api-contracts.md](docs/api-contracts.md)               | Route contracts and runtime invariants                      |
| [CONTRIBUTING.md](CONTRIBUTING.md)                           | Contributor workflow and quality gates                      |
| [SECURITY.md](SECURITY.md)                                   | Vulnerability reporting process                             |
| [docs/adr/](docs/adr/)                                       | 7 ADRs: rate limits, soft delete, Stripe, AI, subscriptions |
| [docs/state-diagrams/](docs/state-diagrams/)                 | Checkout, auth, paywall, quick-log flows                    |
| [docs/postmortems/](docs/postmortems/)                       | Incident analyses                                           |
| [docs/patterns/coach-tools.md](docs/patterns/coach-tools.md) | Coach tool development guide                                |
| [GitHub Issues](https://github.com/misty-step/volume/issues) | Planned features                                            |

## Commits

Conventional Commits required. Lefthook validates.

```bash
feat: add exercise selector    # minor bump
fix: restore type safety       # patch bump
```
