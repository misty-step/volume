---
name: deps
description: |
  Analyze, test, and upgrade dependencies. One curated PR, not 47 version bumps.
  Reachability analysis, behavioral diffs, risk assessment. Package-manager agnostic.
  Use when: "upgrade deps", "dependency audit", "check for updates",
  "outdated packages", "security audit deps", "update dependencies",
  "vulnerable dependencies", "deps".
  Trigger: /deps.
argument-hint: "[audit|security|upgrade <pkg>|report] [--ecosystem npm|pip|cargo|go]"
---

# /deps

Analyze, test, and upgrade Volume's bun-managed dependencies. One curated PR, not 47 version bumps.

**Target:** $ARGUMENTS

## Execution Stance

You are the executive orchestrator.

- Keep upgrade policy, risk acceptance, and final merge-readiness judgment on the lead model.
- Delegate per-package analysis and bounded upgrade work to focused subagents.
- Parallelize across disjoint package clusters (e.g., test infra vs. AI SDK vs. Sentry) where safe.

## Routing

| Mode                | Intent                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **audit** (default) | Full: `bun outdated`, analyze risk, upgrade, test, PR                                                           |
| **security**        | Security-only: `bun audit --audit-level=high` findings with reachability against `src/`, `convex/`, `packages/` |
| **upgrade** [pkg]   | Targeted: `bun update <pkg>` with full analysis                                                                 |
| **report**          | Analysis only, no upgrades — produce the report                                                                 |

Volume is single-ecosystem (bun/npm). `--ecosystem` is effectively a no-op, but honor it if a future workspace adds another.

### Mode → Phase Matrix

| Mode          | Phase 0 | Phase 1           | Phase 2 | Phase 3 | Phase 4 | Phase 5     |
| ------------- | ------- | ----------------- | ------- | ------- | ------- | ----------- |
| audit         | ✓       | ✓                 | ✓       | ✓       | ✓       | PR          |
| security      | ✓       | ✓ (security only) | ✓       | ✓       | ✓       | PR          |
| upgrade [pkg] | ✓       | skip              | ✓       | ✓       | ✓       | PR          |
| report        | skip    | ✓                 | ✓       | skip    | skip    | Report only |

## Ecosystem Detection

Volume is a bun monorepo: root `package.json` + `packages/canary-sdk` (`@canary-obs/sdk`). Lockfile is `bun.lock` (text, committed). `packageManager` is pinned to `bun@1.3.9`.

| Signal in Volume                                                   | Ecosystem             |
| ------------------------------------------------------------------ | --------------------- |
| `bun.lock`, `package.json` "packageManager": "bun@1.3.9"           | bun/npm               |
| `packages/*/package.json` (workspaces)                             | bun workspace members |
| `patches/test-exclude@7.0.2.patch` + `patchedDependencies` in root | bun patched deps      |

No `bun.lock` found → STOP. `bun install` to regenerate, or the repo is corrupt. Never hand-edit `bun.lock`.

## Workflow

Six phases, gated. Each phase must complete before the next begins.

### Phase 0: Baseline

Run the full quality pipeline before touching any dep:

```bash
bun run typecheck && bun run lint && bun run test && bun run build
bun run security:audit   # = bun audit --audit-level=high
```

If any step fails, **STOP** — fix the baseline first. You cannot attribute regressions to a bump when `master` is already red.

Gate: typecheck, lint, vitest, build, and `security:audit` all green.

### Phase 1: Discover

```bash
bun outdated             # human survey
bun outdated --json      # parseable
bun audit --audit-level=high
bun pm ls                # direct deps
bun pm scan              # reachability/tree inspection
```

Categorize each outdated dependency. Volume hot deps deserve special flags:

- **Patch** (1.2.3 → 1.2.4): safe. Group into a single commit.
- **Minor** (1.2.3 → 1.3.0): usually safe. Changelog scan; flag `convex`, `@clerk/nextjs`, `stripe`, `ai`, `@ai-sdk/react`, `@openrouter/ai-sdk-provider`, `@sentry/nextjs`, `vitest`, `lefthook` as sensitive even on minor.
- **Major** (1.2.3 → 2.0.0): full analysis. Always-hot: `next@^16.1.6`, `react@^19.2.4`, `convex@^1.31.7`, `@clerk/nextjs@^6.37.4`, `stripe@^20.3.1`, `@sentry/nextjs@^10.39.0`, `ai@^6.0.0`, `vitest@^3.2.4`.

Cross-check Volume's `overrides` block in `package.json` (currently `flatted`, `minimatch`, `picomatch`, `rollup`, `terser-webpack-plugin`). An upstream bump may obsolete an override — do not silently drop them without a `bun run security:audit` pass.

Gate: structured list of outdated deps + CVE list + override re-check.

### Phase 2: Analyze

For each non-patch update AND every `bun audit` finding, analyze three concerns. Parallelize across packages, not within a single package.

**Changelog:** Read release notes. Call out anything touching Next.js App Router config (`next.config.ts`), Convex schema/types (`convex/_generated/api.d.ts`), Clerk middleware (`middleware.ts`, `e2e/auth.setup.ts`), Stripe webhook shape (ADR-0003), Sentry wrapping, or AI SDK `ModelMessage[]` conversation format. Verdict: `migration_required: yes | no | unknown`.

**Reachability:** Trace import chains from the CVE-affected symbol into Volume code:

```bash
rg -l "from ['\"]<pkg>['\"]" src/ convex/ packages/
rg "<symbol>"               src/ convex/ packages/
bun pm scan                 # transitive context
```

Verdict: `reachable | not reachable | unknown`. See `references/reachability-analysis.md`.

**Behavioral:** Compare API surface before/after. Check install scripts, network calls, permission shifts. See `references/behavioral-diff.md`. Verdict: `risk: critical | high | medium | low`.

Gate: all packages have verdicts for all three concerns. Any `unknown` reachability on critical/high CVEs → investigate deeper or escalate.

### Phase 3: Upgrade

Create branch `deps/upgrade-YYYY-MM-DD`. Apply upgrades in risk order:

1. **Patches** — `bun update` each, single grouped commit (`chore(deps): patch-level bumps`).
2. **Security fixes** — one commit per fix for clean revert (`chore(deps): bump <pkg> to fix CVE-YYYY-NNNNN`).
3. **Minors** — grouped by concern (e.g. "AI SDK ecosystem": `ai`, `@ai-sdk/react`, `@openrouter/ai-sdk-provider`), one commit per group.
4. **Majors** — one commit per package; isolate for bisect.

Use `bun update <pkg>` for in-range bumps, `bun add <pkg>@<ver>` / `bun add -D <pkg>@<ver>` for pinned targets, `bun remove <pkg>` when deleting. After any `convex` bump, run `bunx convex dev` to regenerate `convex/_generated/api.d.ts` before typechecking.

Conventional Commits required (Lefthook enforces): `chore(deps): <what + why>`. Reference override/patch changes in the PR body.

Major bump with no migration guide and significant API changes → **escalate via `/groom`** into a dedicated backlog item. Don't guess at migration (especially Next.js majors).

Gate: all upgrades committed atomically per group.

### Phase 4: Test

After each upgrade group, run the Volume verification pipeline in order — stop at the first failure:

1. `bun run typecheck` — fastest fail signal (catches Convex `_generated` drift, Clerk type changes).
2. `bun run lint` — eslint/prettier rule updates.
3. `bun run architecture:check` — boundary shift detection.
4. `bun run test:coverage` — functional + thresholds (lines 52, branches 83, functions 73, statements 52 per `vitest.config.ts`).
5. `bun run test:e2e` — only when the group touches Next.js, Clerk, Convex, Stripe, or the coach path.
6. `bun run build` — Next.js compile-time verification.
7. `bun run security:audit` — ensure no new high-sev CVEs were introduced.
8. `dagger call check --source .` — full CI parity (Docker required).
9. Smoke: `bun run dev`, `curl http://localhost:3000/api/health | jq`, log a set end-to-end.

If anything fails: bisect within the group, `git revert` the failing package, note it in the report as "upgrade blocked — <failure mode>". Do not proceed past a failing group.

Gate: all upgrade groups pass the pipeline (or are reverted with notes).

### Phase 5: Report

Produce a single PR with structured body:

```markdown
## Dependency Upgrades

### Summary

X packages upgraded, Y security fixes, Z blocked (with reasons).

### Security

| CVE            | Package | Severity | Reachable?                  | Action                        |
| -------------- | ------- | -------- | --------------------------- | ----------------------------- |
| CVE-2024-XXXXX | flatted | High     | Yes — transitive via vitest | Override bumped 3.3.1 → 3.3.3 |
| CVE-2024-YYYYY | xmldom  | Medium   | No — devDependency only     | No action (noted)             |

### Upgrades

| Package | From   | To     | Type  | Risk | Changelog                                       |
| ------- | ------ | ------ | ----- | ---- | ----------------------------------------------- |
| ai      | 6.0.0  | 6.1.0  | Minor | Low  | ModelMessage shape unchanged; coach tools pass  |
| next    | 16.1.6 | 17.0.0 | Major | High | App Router config rewrite — see migration guide |

### Reachability Report

[Which CVE-affected functions are actually imported under `src/`, `convex/`, `packages/`]

### Behavioral Changes

[Install scripts added/removed, new network calls, permission changes, override/patch diffs]

### Test Results

[typecheck / lint / architecture:check / test:coverage / test:e2e / build / security:audit / dagger]

### Risk Assessment

[Overall risk: low/medium/high. Rationale. Residual risks. Env var impact — re-run `./scripts/verify-env.sh --prod-only`.]
```

For **report** mode: emit this output without creating a branch or PR.
For **security** mode: include only the Security and Reachability sections.

## Pre-merge checklist

- [ ] `bun run quality:full` green (typecheck + lint + architecture:check + tests + build).
- [ ] `bun run test:e2e` green when framework/auth/billing/coach touched.
- [ ] `./scripts/verify-env.sh --prod-only` still passes; no new required env var.
- [ ] Breaking-change notes written into PR body with changelog links.
- [ ] Override list and `patches/test-exclude@7.0.2.patch` re-verified; pinned transitives didn't drift (`import-in-the-middle`/`require-in-the-middle` pairs with `@sentry/nextjs`).
- [ ] CI green end-to-end — never merge on "informational" red.

## Hand-offs

- Coach-ecosystem bump with behavior delta → `/code-review` + manual smoke via `/volume-manual-qa`.
- Next.js or React major → dedicated migration backlog item via `/groom`.
- Transitive CVE not solvable via override → `/diagnose`.
- Post-bump rotation needs (Stripe, Clerk, OpenRouter secrets) → document in PR body; rotate before merge.

## Gotchas

- **Skipping baseline.** If `bun run typecheck && bun run lint && bun run test` is red before the bump, you cannot attribute regressions. Fix first.
- **Treating all CVEs equally.** A critical CVE in an unreachable function is lower priority than a medium CVE in `convex/sets.ts` or `src/app/(app)/page.tsx`. 92–97% of CVEs sit in functions never called — `bun pm scan` + `rg` first.
- **Batch-upgrading everything.** One 40-package PR is unbisectable. Atomic groups by risk tier; one curated PR per concern (e.g., "bump AI SDK ecosystem").
- **Forgetting `bunx convex dev` after a convex bump.** Stale `convex/_generated/api.d.ts` fails typecheck with confusing errors.
- **Bumping `ai` / `@ai-sdk/react` / `@openrouter/ai-sdk-provider` without verifying `ModelMessage[]` conversation handling.** Regressions silently break coach memory across turns.
- **Dropping overrides silently.** `flatted`, `minimatch`, `picomatch`, `rollup`, `terser-webpack-plugin` are pinned for transitive vuln fixes. Removing one without re-running `bun run security:audit` reintroduces the CVE.
- **`@sentry/nextjs` pair drift.** `import-in-the-middle` and `require-in-the-middle` must track Sentry's tested versions — don't let them float.
- **Hand-editing `bun.lock`.** Let bun regenerate. Merge conflicts → `bun install` to re-resolve.
- **Major bumps without migration guides.** Escalate via `/groom`; don't guess Next.js/React/Convex migrations.
- **Assuming single workspace.** `packages/canary-sdk` has its own `package.json`; when bumping a shared dep, check both manifests.
