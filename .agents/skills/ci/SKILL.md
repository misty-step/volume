---
name: ci
description: |
  Audit a repo's CI gates, strengthen what is weak, then drive the pipeline
  green. Owns confidence in correctness — lint, types, tests, coverage,
  secrets. Dagger is the canonical pipeline owner; absence is auto-scaffolded,
  not escalated. Acts on its assessment; never returns a report where action
  would suffice. Never returns red without a structured diagnosis.
  Bounded self-heal: auto-fix lint/format, regenerate lockfiles, retry
  flakes. Escalates only genuine algorithm/logic failures.
  Use when: "run ci", "check ci", "fix ci", "audit ci", "is ci passing",
  "run the gates", "dagger check", "why is ci failing", "strengthen ci",
  "tighten ci", "ci is red", "gates failing".
  Trigger: /ci, /gates.
argument-hint: "[--audit-only|--run-only]"
---

# /ci

Confidence in correctness. Volume's CI is load-bearing: `dagger call check
--source .` is the canonical local-equals-remote contract. If a gate is weak
(coverage floor lowered, architecture check missing, secrets scan skipped),
green means nothing. So this skill **audits first, then runs**.

Stops at green CI. Does not review code semantics (→ `/code-review`), does
not address review comments (→ `/settle`), does not chase logic bugs
(→ `/diagnose`), does not ship.

## Modes

- Default: audit → run. Full pass.
- `--audit-only`: produce audit report and gap proposals; do not run gates.
- `--run-only`: skip audit, just drive gates green.

## Stance

1. **Audit before run.** A weak pipeline passing is worse than a strong one
   failing. Inventory all three layers (Lefthook, Dagger, GitHub Actions)
   before trusting green.
2. **Dagger-mandatory, auto-scaffolded.** `dagger.json` + `dagger/src/` is
   the primary pipeline owner. If missing/broken, scaffold inside `dagger/`
   — do NOT escalate unless Docker is genuinely unavailable. Fold every
   Lefthook pre-push gate into `check()`, thin `.github/workflows/ci.yml`
   to a single `dagger call check --source .` step where practical, and
   keep `.lefthook.yml` aligned. Raw `bun run lint` / `bun run test` in
   workflow YAML bypasses the hermetic-container contract.
3. **Act, do not propose.** Mechanical strengthenings (missing gate,
   uncovered script, duplicate workflow, threshold upward, Dagger scaffold)
   are applied directly. Escalate only when the change would disable a
   currently-green test, materially change scope, or encode a product
   decision the code alone cannot resolve.
4. **Fix-until-green on self-healable failures.** Don't report red and
   exit. Either fix or produce a precise diagnosis the human can act on.
5. **No quality lowering, ever.** Coverage thresholds in `vitest.config.ts`
   (lines 52, branches 83, functions 73, statements 52), `--max-warnings=0`,
   `bun audit --audit-level=high`, `tsc --noEmit` strictness — all
   load-bearing walls. Raising the floor is fine; lowering it is forbidden.
   `validate-lefthook-config` enforces cross-file threshold parity.
6. **Bounded self-heal.** See `references/self-heal.md` for the fix-vs-
   escalate decision. Typecheck, architecture, coverage-under-threshold,
   and security:audit failures escalate — those are logic/boundary bugs
   or dep decisions.

## Process

### Phase 1 — Audit (skip if `--run-only`)

Read `references/audit.md` for the full audit rubric. Inventory in parallel.
**Pipeline presence is the first gate.** If `dagger.json` or `dagger/src/`
is absent or the module won't build, scaffold/repair inline — do not stop,
do not wait for approval. The skill owns this.

- **Pipeline presence (blocking):** `dagger.json` present? `dagger/src/`
  module compiles? `dagger functions` lists `check`? `dagger call check
--source .` reachable from a clean checkout with Docker running? Missing
  = HIGH, blocks green until scaffolded.
- **Three-layer alignment:** `.lefthook.yml` pre-push, `dagger/src/`
  `check()`, and `.github/workflows/ci.yml` parallel jobs must cover the
  same gates. Drift between layers is a finding.
- **GitHub Actions thinness:** `.github/workflows/ci.yml` jobs should
  invoke Volume's documented scripts (`bun run typecheck`, `bun run lint`,
  `bun run architecture:check`, `bun run test:coverage`, `bun run
security:audit`, `bun run build`) — or better, `dagger call`. Inline
  bash beyond these = finding.
- **Gate coverage:** lint (`bun run lint`), format (prettier via
  Lefthook), typecheck (`bun run typecheck`), tests + coverage
  (`bun run test:coverage`), architecture (`bun run architecture:check`
  → `scripts/verify-architecture.ts` → `src/lib/architecture-checker.ts`),
  security audit (`bun run security:audit`), secrets scan (trufflehog via
  Lefthook pre-commit + `.github/workflows/trufflehog.yml`), build
  (`bun run build`), config invariants (`bunx tsx
scripts/validate-lefthook-config.ts`) — each covered, or a gap?
- **Thresholds:** coverage floors in `vitest.config.ts` match
  `scripts/verify-coverage.ts` (enforced by validator); eslint
  `--max-warnings=0`; `bun audit --audit-level=high` aligned between
  Lefthook and GHA.
- **Hermeticity:** Convex tests use time-window assertions (no fake
  timers per CLAUDE.md); fixtures pinned; no network in unit suites.
- **Speed:** `dagger call check --source .` under ~10 minutes? Lefthook
  pre-commit must stay sub-second (parallel). Flag if slower.
- **Hook install:** `bunx lefthook install` wired via `prepare` script?
  `post-checkout` reminder for `bunx convex dev` present?
- **Merge gate:** `.github/workflows/ci.yml` `merge-gate` job aggregates
  results and publishes a commit status?

Emit a structured audit report:

```markdown
## CI Audit

| Concern                 | Status | Severity | Proposed fix                                |
| ----------------------- | ------ | -------- | ------------------------------------------- |
| dagger call check       | ok     | -        | -                                           |
| architecture:check      | ok     | -        | -                                           |
| coverage floor parity   | weak   | high     | Align vitest.config.ts ↔ verify-coverage.ts |
| trufflehog (pre-commit) | ok     | -        | -                                           |
| GHA merge-gate          | gap    | med      | Add job to collect + publish status         |
```

For each gap, apply the mechanical remediation directly. No "proposals"
awaiting approval. Escalate only for currently-green-test disablement,
scope changes, or product decisions.

If audit finds no gaps worth fixing, say so and proceed.

### Phase 2 — Run (skip if `--audit-only`)

1. Run the canonical pipeline: `dagger call check --source .`. No
   fallback. If Dagger is absent/broken, Phase 1 failed to block — abort
   and re-audit. If Docker is genuinely unavailable, escalate; do not
   substitute `bun run quality:full` as the authoritative gate.
2. Capture structured per-gate output (gate name, pass/fail, excerpt).
3. If green → emit report, exit 0.
4. If red → classify each failure per `references/self-heal.md`:
   - **Self-healable:**
     - Prettier/eslint drift → `bun run format` + `bun run lint:fix`
     - Stale lockfile → `rm bun.lockb || true; bun install --frozen-lockfile`
     - Lefthook desync → `bunx lefthook install --force`
     - Flaky test → rerun `bun run test:affected` up to 2x; if stable-fail,
       it's real, escalate
       Dispatch a focused builder subagent, commit, re-run the failing gate.
   - **Escalatable (stop + diagnose):**
     - `bun run typecheck` failure (logic bug)
     - `bun run architecture:check` failure (boundary regression in
       `src/lib/architecture-checker.ts`)
     - Coverage under `vitest.config.ts` thresholds (missing test)
     - `bun run security:audit` high/critical (dep bump needed)
     - Trufflehog match (secret leak — halt, never auto-commit)
     - Test that encodes a behavior change → hand off to `/diagnose`
       Emit structured diagnosis (file:line, gate name, excerpt, candidate
       cause). Exit non-zero.
5. Bounded retries: cap self-heal attempts at **3 per gate**. Further
   failures escalate even if classified as self-healable.

### Phase 3 — Verify

Final pass of `dagger call check --source .` after any fixes. Green or
bust. Confirm remote state with `gh pr checks <n>` / `gh run list
--branch=<branch> --limit=5`; on failure, `gh run view <run-id>
--log-failed` for detail and `gh run rerun <run-id>` only after a
real fix. If any gate was strengthened in Phase 1, the full pipeline
must pass under the new thresholds before the skill returns clean.

## What /ci Does NOT Do

- Review code semantics → `/code-review`
- Shape tickets or write specs → `/shape`
- Chase legitimate test failures / logic bugs → `/diagnose`
- Address review comments or coordinate merges → `/settle`
- Deploy or release → release-please handles tags on master; prod
  Convex deploy is manual (`CONVEX_DEPLOYMENT=prod:whimsical-marten-631
bunx convex deploy -y`)
- QA against a running app → `/qa`
- Write new test frameworks — uses vitest + playwright as configured
- Lower any threshold in `vitest.config.ts`, `.lefthook.yml`, or
  `.github/workflows/ci.yml` to make a gate pass

## Anti-Patterns

- **Reporting red and exiting** on auto-fixable prettier/eslint drift —
  run `bun run format` and `bun run lint:fix`.
- **Lowering coverage thresholds** in `vitest.config.ts` or softening
  `--audit-level=high` to make a gate pass. Red flag.
- **Skipping audit** on a first-run against a branch. Three-layer
  alignment drifts silently.
- **Declaring green without `dagger call check --source .`.** "GHA
  passed" is not equivalent — it runs on blacksmith runners with their
  own caches.
- **Running raw `bun run lint` / `bun run test` as the authoritative
  gate** when Dagger is available. Raw shell bypasses the hermetic-
  container contract.
- **Treating `.github/workflows/ci.yml` as source of truth** when
  `dagger/src/` exists. Per Volume AGENTS.md, Dagger is the primary
  owner.
- **Unbounded self-heal loops.** 3 retries per gate.
- **Auto-fixing a failing Convex mutation test by deleting it** or
  adding `.skip`. Escalate to `/diagnose`.
- **Auto-fixing a type error with `as any` / `@ts-ignore`.** Escalate.
- **Using `SKIP_QUALITY_GATES=1`** to make a push land. That's for
  emergency human use, not skill use. Never.
- **Declaring "green"** while gates are still running. Wait for exit.
- **Editing `.lefthook.yml` without rerunning `validate-lefthook-
config`** — the validator enforces coverage-threshold parity,
  audit-level parity, valid CLI flags, and real branch refs.

## Output

Report:

- **Audit:** gaps found across Lefthook / Dagger / GHA layers, severity,
  what was strengthened, what was deferred.
- **Run:** gates attempted, per-gate status, self-heals applied (count +
  summary), escalations (file:line diagnosis, handoff target).
- **Final:** green / red, exit code, residual risks, backlog items filed
  for deferred strengthenings.

```markdown
## /ci Report

Audit: 2 gaps found (GHA merge-gate missing, coverage floor parity drift).
→ Strengthened: merge-gate job added; vitest.config.ts ↔ verify-coverage.ts realigned.
→ Deferred: none.
Run: 7 gates via `dagger call check --source .`, 1 self-heal (prettier drift,
`bun run format`), 0 escalations.
Final: green. Pipeline passes in 4m12s. `gh pr checks` confirms remote.
```

On failure:

```markdown
## /ci Report — RED

Gate: architecture:check
Failure: src/lib/architecture-checker.ts flagged forbidden import
convex/sets.ts → src/components/ui/button.tsx (boundary regression)
Classification: boundary violation (UI imported from convex/)
Action: escalated — handoff to /diagnose for root-cause. No auto-fix:
Volume convention is convex/ owns data, src/ owns UI.
```
