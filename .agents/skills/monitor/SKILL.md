---
name: monitor
description: |
  Post-deploy signal watch. Poll healthcheck and configured signals through
  a grace window. Emit structured events. Escalate to /diagnose on trip,
  close clean on green. Thin watcher, not diagnostician.
  Use when: "monitor signals", "watch the deploy", "is the deploy ok",
  "post-deploy watch", "signal watch", "grace window", "watch production".
  Trigger: /monitor.
argument-hint: "[<deploy-receipt-ref>] [--grace <duration>] [--config <path>]"
---

# /monitor

Watch Volume signals after a deploy. Escalate to `/diagnose` on regression.
Close clean when signals stay green through the grace window.

This skill observes and escalates. It does not diagnose root cause
(`/diagnose` does). It does not rollback (caller decides). It does not
page humans (outer loop decides).

## Execution Stance

You are a thin watcher.

- Load config or fall back to `/api/health` polling.
- Poll on a cadence that tightens near deploy time, then relaxes.
- On trip: emit one `monitor.alert` event with payload, exit, hand off.
- On clean: emit one `monitor.done` event, exit.
- Never analyze why a signal tripped. Never attempt remediation.

Query syntax for each signal (Convex logs grep, Sentry API, Vercel CLI)
lives in `references/signals.md`. Judgment about what constitutes a real
trip vs noise lives here.

## Inputs

| Input              | Source                                                             | Default                                                                                  |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| deploy receipt ref | positional arg from `/deploy`                                      | required in outer loop; absent → healthcheck-only on `https://volume.fitness/api/health` |
| grace window       | `--grace` flag, else `.spellbook/monitor.yaml`, else built-in      | 10 minutes                                                                               |
| signal config      | `.spellbook/monitor.yaml`                                          | health + Convex logs + Sentry                                                            |
| release sha        | deploy receipt; correlates Sentry issues to release tag `v<x.y.z>` | from receipt                                                                             |

## Signals

Volume polls six signals. The health endpoint and Convex log tail are
mandatory; the rest activate if their tool auth is present.

1. **`/api/health`** (canonical smoke)
   - `curl -s https://volume.fitness/api/health | jq` (local: `http://localhost:3000/api/health`)
   - Asserts Convex URL reachable, Clerk JWT issuer set, OpenRouter reachable if key present, basic response shape.
   - Trip on non-200 or `ok: false`. Failure body names the failing subsystem.

2. **Convex prod logs**
   - `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex logs --history 100`
   - Stream during hot window: `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex logs`
   - Trip on ERROR rate over baseline, auth failures, Stripe webhook errors, rate-limit overflows (`rateLimits` table), cron failures (`convex/crons.ts`), or webhook signature failures in `convex/http.ts` (signals Stripe secret drift).

3. **Sentry** (`@sentry/nextjs`; configs in `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`)
   - Match new issues against release tag `v<x.y.z>` from deploy receipt SHA.
   - Any new issue attributable to the release sha is high-signal.

4. **Canary SDK** (`packages/canary-sdk` workspace)
   - Browser + server events. Wiring managed by `./scripts/deploy-observability.sh`; dashboard per runbook.

5. **Vercel runtime**
   - `vercel logs <deployment>` for Next.js errors; `vercel inspect <deployment>` for routing/env state.
   - Trip on deployment state ERROR or HTTP 5xx rate over baseline.

6. **GitHub Actions / release-please**
   - `gh run list --branch=master --limit=5` for post-merge CI.
   - `gh pr list --state=open --author=app/release-please` for pending release state.

## Contract

**Emits exactly one terminal event per invocation.** Either `monitor.done`
or `monitor.alert` — never both, never zero.

### Event schema

Events extend the `/flywheel` envelope so the outer loop can consume them
directly. Append to the active cycle's `cycle.jsonl` when running under
`/flywheel`; otherwise write to `.spellbook/monitor/<ulid>.jsonl`.

```json
{
  "schema_version": 1,
  "ts": "2026-04-20T12:00:00Z",
  "cycle_id": "01HQ...",
  "kind": "monitor.alert",
  "phase": "monitor",
  "agent": "monitor",
  "refs": ["deploy-receipt:<ref>", "sha:<commit>"],
  "findings": [
    {
      "signal": "health|sentry|convex-logs|vercel|canary",
      "status": "red",
      "observed": "503",
      "expected": "200",
      "first_trip_ts": "2026-04-20T12:02:13Z",
      "consecutive_trips": 2,
      "evidence": "curl https://volume.fitness/api/health",
      "detail": "openrouter subsystem returned ok:false"
    }
  ],
  "note": "health returned ok:false two consecutive polls; escalating"
}
```

On `monitor.done` `findings` holds the final sample per signal (for audit)
and `note` summarizes the clean window.

### Exit codes

| Exit | Meaning                                                                |
| ---- | ---------------------------------------------------------------------- |
| 0    | `monitor.done` emitted — signals green through grace window            |
| 2    | `monitor.alert` emitted — signal tripped, escalating to `/diagnose`    |
| 1    | Tooling failure (config parse, network, auth) — `phase.failed` emitted |

## Escalation Rule

A signal **trips** when BOTH hold:

1. Observed value violates its threshold.
2. Violation confirmed on the next poll (`consecutive_trips >= 2`).

**Hard failures skip the confirm step** (one-shot trip):

- `/api/health` returns 5xx, connection refused, DNS failure, or TLS error
- Vercel deployment transitions to ERROR state
- Webhook signature verification fails in `convex/http.ts` (Stripe secret drift)
- `./scripts/verify-env.sh --prod-only` fails during grace (env drift, not code — still escalates)

**Slow-burn failures require two consecutive trips:**

- Sentry new-issue count attributable to release sha
- Convex ERROR log rate over baseline
- Vercel HTTP 5xx rate over baseline
- Canary SDK event anomalies

Single-sample flakes are not trips. Confirm with two consecutive samples.
Details in `references/grace-window.md`.

## Polling Cadence

The window tightens near deploy time — obvious breakage surfaces in the
first two minutes, subtler drift in minutes 5–10.

| Window           | Interval                                               |
| ---------------- | ------------------------------------------------------ |
| Minute 0–2 (hot) | every 30s (cache-warm `/api/health` + Convex log tail) |
| Minute 2–5       | every 60s                                              |
| Minute 5–10      | every 120s                                             |
| After grace      | close clean if no trip                                 |

**Default grace window: 10 minutes.** Longer than the generic 5 because
Volume's Stripe webhooks, Clerk JWT sync, and Convex cron cadence all
need runway before real traffic exercises them.

## Configuration

```yaml
# .spellbook/monitor.yaml
grace_window: 10m
healthcheck:
  url: https://volume.fitness/api/health
  expected_status: 200
  hard_fail_on_5xx: true
  require_ok_field: true # body must include { ok: true }
signals:
  - name: convex_errors
    source: shell
    query: "CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex logs --history 100 | grep -c ERROR"
    threshold: "> 0"
  - name: sentry_new_issues
    source: sentry
    release: "v<sha>"
    threshold: "> 0"
  - name: vercel_5xx
    source: shell
    query: "vercel logs <deployment> | grep -c ' 5[0-9][0-9] '"
    threshold: "> 0"
```

Absent config → health-only on `https://volume.fitness/api/health`. Absent
receipt AND absent config → refuse to run, emit `phase.failed` with note
`monitor: no signal source available`.

## Grace Window Judgment

**Do not extend on soft trips.** If Convex ERROR rate flaps green after
one bad minute, keep polling but do not reset the window.

**Do extend when the deploy ramp is gated.** If the receipt reports a
staged rollout, align the window to finish after the final ramp step
plus two polls.

## Control Flow

```
/monitor [<deploy-receipt-ref>] [--grace <duration>]
    │
    ▼
  1. Load .spellbook/monitor.yaml or fall back to /api/health + convex logs
  2. Compute deadline = now + grace_window (default 10m, adjusted for ramp)
  3. Poll loop on tightening cadence (30s → 60s → 120s):
       ├── curl /api/health; parse body
       ├── tail convex logs; grep ERROR
       ├── Sentry API; filter by release tag v<sha>
       ├── Vercel CLI; check deployment + 5xx rate
       ├── Hard trip (health 5xx, vercel ERROR, env drift) → monitor.alert, exit 2
       ├── Soft trip confirmed (2 consecutive) → monitor.alert, exit 2
       └── All green AND now >= deadline → monitor.done, exit 0
    │
    ▼
  Emit terminal event. Skill holds no global state.
```

## Invocation

```bash
# Outer loop: receipt from /deploy
/monitor deploy:01HQ...

# Ad-hoc: longer grace for risky change
/monitor --grace 20m

# Smoke test on prod health only
/monitor --config .spellbook/monitor.health-only.yaml
```

## Hand-off to /diagnose

On trip, bundle for `/diagnose`:

- Last 5 monitor events from `cycle.jsonl`
- Current deploy receipt + release sha
- Sentry issue link (if tripped)
- Convex log tail command: `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex logs --history 100`
- Which subsystem tripped: `health | sentry | convex-logs | vercel | canary`

## Gotchas

- **One terminal event per invocation.** Never emit both `monitor.done`
  and `monitor.alert`. Trust the first terminal condition.
- **Exit 2 is not a failure.** It is escalation. Callers treating nonzero
  as failure will mistake alerts for tooling bugs.
- **Do not triage inside monitor.** Escalate on first real trip — no
  `note` field of "probably Clerk JWT drift." Root cause is `/diagnose`'s
  job.
- **Do not rollback.** Even if `/api/health` flat-lines. The outer loop
  may be mid-ramp or forward-fixing.
- **Do not extend grace to avoid escalation.** If it tripped, it tripped.
- **Health connection refused is a hard trip.** Two polls of unreachable
  volume.fitness means users are already seeing errors.
- **Env drift escalates the same as code.** If `./scripts/verify-env.sh
--prod-only` fails during grace, that is still a trip — `/diagnose`
  will sort code vs config.
- **Match Sentry issues by release sha, not timestamp.** New issues with
  an older release tag are noise for this watch.
- **Webhook signature failures in `convex/http.ts` mean Stripe secret
  drift.** This is a hard trip — prior incident class covered in
  `docs/postmortems/2026-01-16-stripe-env-vars.md`.
- **Never page humans.** Write the event. Outer loop routes Slack,
  PagerDuty, and `/diagnose`. See `./scripts/configure-sentry-alerts.sh`
  for Sentry alert rules; runbook links in `CLAUDE.md`.
- **Known-debt pointers for context during watch:**
  `backlog.d/005-harden-runtime-observability-paths.md`, and prior
  incidents at repo root (`INCIDENT-20260307.md`, `INCIDENT-20260311.md`,
  `INCIDENT-20260314.md`, `INCIDENT-20260328.md`).
