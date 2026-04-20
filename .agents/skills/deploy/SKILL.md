---
name: deploy
description: |
  Ship merged code to a deploy target. Thin router — detects target from
  repo config, dispatches to platform-specific recipe, captures a
  structured receipt (sha, version, URL, rollback handle), stops when the
  target reports healthy. Does not monitor (→ /monitor), does not triage
  (→ /diagnose), does not decide when to deploy.
  Use when: "deploy", "ship this", "ship to prod", "release", "push to
  staging", "deploy this branch", "release cut".
  Trigger: /deploy, /ship-it, /release.
argument-hint: "[--env <name>] [--version <ref>] [--rollback] [--dry-run]"
---

# /deploy

Ship merged code for Volume. One invocation fans out to **two** targets
that must both be healthy: Next.js on Vercel (auto on master) and Convex
functions on `prod:whimsical-marten-631` (manual). One receipt covers
both. Monitoring lives in `/monitor`; triage lives in `/diagnose`.

## Execution Stance

You are the executive orchestrator for a narrow, high-stakes action.

- Keep the abort/ship decision on the lead model. Do not delegate go/no-go.
- Delegate env verification, tag inspection, and log tailing to subagents.
- Run validation steps in parallel; the Convex deploy itself is serial.

## Contract

**Input:** a release-please tag on master (default: `git describe --tags
--exact-match HEAD`). Optional `--env` (defaults to `prod`, the only
supported env today). Optional `--version` overrides the HEAD tag.

**Output:** a deploy receipt (schema below) emitted to stdout as JSON
and appended to the cycle manifest if one exists
(`.spellbook/cycle-manifest.json`, see `/flywheel`).

**Stops at:** both targets healthy — Vercel reports `READY` AND
`curl -s https://volume.fitness/api/health | jq .ok` returns `true`
within the grace window.

**Does NOT:** monitor post-deploy, triage failures, rollback
automatically, set env vars, run migrations, or cut the release-please
tag itself.

## Protocol

### 1. Detect target

Volume's topology is fixed and dual-target. Verify, don't discover:

1. Repo root contains `convex/` AND `next.config.*` → target: `volume-dual`
2. `CONVEX_DEPLOYMENT` resolvable as `prod:whimsical-marten-631`
3. `vercel.json` or `.vercel/project.json` present → Vercel side confirmed
4. release-please config present (`.github/release-please-*.json` or
   workflow) → tag cadence confirmed
5. Anything else → abort with "this is not the Volume repo" — do not
   attempt generic detection

`--env staging` is not supported. Fail closed.

### 2. Validate (parallel)

Dispatch these in parallel. All must pass before either deploy fires:

- **Clean tree:** `git status` returns no uncommitted changes. Never
  deploy with dirty working tree (see Pitfalls table in CLAUDE.md).
- **Tag resolves:** `git fetch origin --tags && git describe --tags
--exact-match HEAD` returns a `v<x.y.z>` tag minted by release-please.
- **Squash-merged:** the HEAD commit trail reads as a squash into
  master (repo policy — rebase/merge commits are rejected upstream).
- **CI green:** `gh pr checks <n>` on the release PR, or
  `gh run list --branch=master --limit=5` — Dagger merge-gate must be
  green for this sha.
- **Env parity:** `./scripts/verify-env.sh --prod-only` — asserts both
  Vercel and Convex prod have: `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `CLERK_JWT_ISSUER_DOMAIN`,
  `OPENROUTER_API_KEY`, plus Vercel's `NEXT_PUBLIC_*` set.
- **Local quality on tag SHA:** `bun run quality:full` (typecheck &&
  lint && architecture:check && test:coverage && build).
- **No secrets in diff:** `git show <sha>` grep for `sk_live_`,
  `whsec_`, `sk-or-`, `CLERK_SECRET`. Abort if found.
- **Current state:** capture current Vercel deployment ID
  (`vercel ls | head`) and current Convex deployed commit
  (`bunx convex logs --history 1`).

### 3. Idempotence check

If the current Vercel deployment sha == tag sha AND `curl -s
https://volume.fitness/api/health | jq .version` matches: skip deploy.
Emit a receipt with `action: "no-op"` and the existing rollback handles.
Re-entry from `/flywheel` is normal and must be cheap.

### 4. Capture rollback handles BEFORE deploy

Volume has two reversal paths — both must be captured, or abort:

- **Vercel:** previous deployment ID from `vercel ls` (used as
  `vercel rollback <id>`).
- **Convex:** previous deployed commit sha (for `CONVEX_DEPLOYMENT=
prod:whimsical-marten-631 bunx convex deploy -y` on an earlier
  checkout). Schema migrations are one-way — see ADR-0002 / ADR-0006
  before assuming rollback is safe.

Stripe webhook endpoint version is pinned separately. If `convex/http.ts`
touched Stripe API version in this tag, mark
`rollback.stripe_pinned: true` in the receipt and do NOT include a
naive Convex rollback command.

### 5. Dispatch

Serial, in this order:

1. **Convex (manual, first — failure here is cheapest to recover):**
   `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex deploy -y`
2. **Vercel (usually auto on master merge):** confirm via `vercel ls`.
   Manual fallback only: `vercel deploy --prod` (last resort, leaves a
   note in receipt).

### 6. Wait for healthy

Poll with exponential backoff up to 300s:

- `curl -s https://volume.fitness/api/health | jq` → expect `{ok: true}`
- `vercel inspect <deployment>` → `READY`
- Tail `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex logs
--history 50` for handler errors during the first 2 minutes.

If unhealthy within grace: emit receipt with `status: "unhealthy"` and
both rollback commands prominent. Do **not** auto-rollback. `/monitor`
owns that decision.

### 7. Emit receipt

Write JSON to stdout. Append to `.spellbook/cycle-manifest.json` if it
exists (as `deploy_receipts[]`). Also write to
`.evidence/deploys/<date>/<sha-short>.json` for browsability.

## Receipt Schema

```json
{
  "sha": "<commit-sha>",
  "tag": "v1.18.0",
  "env": "prod",
  "target": "volume-dual",
  "convex_deployment": "prod:whimsical-marten-631",
  "vercel_url": "https://volume.fitness",
  "health_ok": true,
  "deployed_at": "<iso>",
  "duration_seconds": 94,
  "status": "healthy",
  "action": "deployed",
  "operator": "phrazzld",
  "rollback": {
    "vercel": "vercel rollback <previous-deployment-id>",
    "convex": "CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex deploy -y --path <previous-commit>",
    "stripe_pinned": false
  }
}
```

Field rules:

- `status` ∈ {`healthy`, `unhealthy`, `timeout`}
- `action` ∈ {`deployed`, `no-op`, `rolled-back`, `aborted`}
- `rollback.vercel` AND `rollback.convex` MUST be present and non-empty
  unless `action == "aborted"` and the abort happened before step 4
- `tag` is the release-please `v<x.y.z>`; `sha` is the full 40-char sha

## Rollback Mode

`/deploy --rollback [--to <handle>]` — reverse the most recent deploy.

- Default `<handle>`: the `rollback` block from the most recent receipt
  in `.evidence/deploys/`
- Vercel rollback is fast and safe: `vercel rollback <id>`
- Convex rollback is **not** safe if the tag added schema migrations or
  bumped Stripe API version. Consult ADR-0002/0006 and verify before
  running. If in doubt, forward-fix via a new release PR instead.
- Emit a new receipt with `action: "rolled-back"`
- Do NOT chain rollbacks — require explicit `--to <tag>` to go further

## Volume Self-Deploy Notes

This is the Volume app repo. There is no "no-op this" escape — the
two-target deploy is real and both sides ship production traffic. If
invoked outside the Volume repo: abort with "wrong repo".

## Gotchas

- **"It must be a code bug":** it's almost always env vars. Run
  `./scripts/verify-env.sh --prod-only` and `curl
https://volume.fitness/api/health | jq` before suspecting code.
- **Uncommitted code:** blocked by step 2. Never override.
- **Stripe TS types lie:** mode-dependent params — trust Stripe docs,
  not the TypeScript types (see CLAUDE.md Pitfalls).
- **`SKIP_QUALITY_GATES=1 git push`:** emergency-only, must be called
  out in the PR body and in this receipt's `notes[]`.
- **Schema migrations are one-way:** a Convex deploy that renames a
  field or changes a validator cannot be rolled back by redeploying
  old code. ADR-0002 and ADR-0006 document safe patterns.
- **Stripe webhook API version:** if `convex/http.ts` bumped Stripe
  API version, do NOT rollback Convex without re-syncing the Stripe
  dashboard endpoint — you will silently drop webhooks.
- **Healthcheck honesty:** `/api/health` exercises Convex, Clerk, and
  OpenRouter. Do not dumb it down to a static 200.
- **Re-deploying same tag:** idempotence check in step 3 prevents it.
- **Outer-loop re-entry:** `/flywheel` may call `/deploy` every cycle;
  no-op path must stay < 5s.
- **Log firehose:** cap Convex log tail at `--history 100`; do not
  dump into the receipt.
- **Incidents during deploy:** create
  `INCIDENT-<UTC-timestamp>.md` at repo root (template:
  `INCIDENT-20260307T002835Z.md`). Link Sentry + this receipt; hand
  off to `/diagnose`.

## Related

- `/flywheel` — outer-loop caller; passes merged tag + env
- `/monitor` — watches `/api/health`, Sentry, Canary, Convex prod logs
  during the grace window; decides on rollback
- `/diagnose` — triages anomalies post-deploy
- `/settle` / `/land` — merge gate (Dagger) before `/deploy` runs
- `ARCHITECTURE.md`, `docs/adr/0002`, `docs/adr/0006` — migration safety
- `CLAUDE.md` — Pitfalls table, verify-env, prod deployment commands
