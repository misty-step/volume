---
name: settle
description: |
  Unblock, polish, and merge a Volume PR. Fix CI/conflicts/reviews,
  polish, refactor, land via `gh pr merge <n> --squash --auto`.
  /land alias runs the final merge.
  Use when: PR is blocked, CI red, review comments open, "land this",
  "get this mergeable", "fix and polish", "unblock", "clean up",
  "make this merge-ready", "address reviews", "fix CI", "land this branch".
  Trigger: /settle, /land (alias), /pr-fix, /pr-polish.
argument-hint: "[PR-number]"
---

# /settle

Take a Volume PR from blocked to clean. Plain `/settle` stops at merge-ready.
`/land` continues through the `misty-step/volume` squash merge.

## Role

Senior engineer who owns the lane end-to-end. Not done until the PR is
architecturally sound, covered by tests, honors Volume's soft-delete and auth
invariants, and survives the ci.yml merge-gate without `--admin`.

## Execution Stance

You are the executive orchestrator.

- Keep review-comment disposition, risk tradeoffs, and merge-readiness judgment on the lead.
- Delegate bounded evidence gathering and implementation to focused subagents.
- Parallel fanout for independent fixes (e.g. separate review threads); serialize when fixes touch `convex/schema.ts` or the merge-gate job.
- Compose `/ci`, `/code-review`, and `/refactor`; do not replace their domain contracts.

## Objective

Take the PR through three phases until it reaches:

- No merge conflicts against `origin/master`
- CI green: merge-gate job in `.github/workflows/ci.yml` (setup + lint + typecheck + architecture + test + security-audit + build)
- Every review finding addressed across all three comment endpoints
- Architecture reviewed with hindsight lens (auth checks, soft delete, `@/lib/logger` usage, no relative imports in `convex/`)
- Tests audited for coverage and quality (`bun run test:coverage`)
- Complexity reduced where possible
- Docs current (ADRs, `docs/api-contracts.md`, CLAUDE.md pitfalls)

## Executive / Worker Split

Keep on the lead:

- disposition of review comments (fix / defer to `backlog.d/` / reject with reasoning)
- hindsight architecture review and simplification choices
- confidence assessment and final merge-readiness judgment

Delegate bounded remediation to ad-hoc **general-purpose** subagents:

- fixing one comment thread or one failing merge-gate step at a time
- reproducing CI failures locally (`bun run quality:full`) and drafting patches
- mechanical cleanups, focused Vitest additions, doc refreshes

Use **Explore** subagents for read-only evidence gathering.
Use **builder** agent for fixes requiring TDD.

## Process

### Phase 1: Fix — Unblock

**Goal:** Get from blocked to green.

1. **State snapshot** —

   ```
   gh pr view <n> --json state,mergeable,mergeStateStatus,reviewDecision,isDraft,headRefName,baseRefName,statusCheckRollup
   gh pr checks <n>
   gh pr diff <n>
   ```

2. **Conflicts** — `git fetch origin master && git rebase origin/master`. For
   `convex/schema.ts` conflicts, resolve manually, then `bunx convex dev` to
   regenerate types. Re-run `bun run quality:full` post-rebase.

3. **CI red → fix** —
   - `gh run view <run-id> --log-failed` to read the failure.
   - Reproduce the exact gate locally: `bun run typecheck`, `bun run lint`,
     `bun run architecture:check`, `bun run test:coverage`, `bun run build`, or
     the full `bun run quality:full`.
   - Flake? Confirm stability with `bun run test:affected` twice, then
     `gh run rerun <run-id>`.
   - Secret scan trip → run `bun run security:scan` locally; rotate the leaked
     secret; force-push cleaned history only with user authorization.

4. **Self-review** — read the entire `gh pr diff <n>` as a reviewer.

5. **Review findings — all three endpoints** (Claude bot and CodeRabbit post to
   different places; missing one skips their feedback entirely):
   - Formal review inline threads (GraphQL `reviewThreads`):
     ```
     gh api graphql -f query='{ repository(owner:"misty-step",name:"volume"){ pullRequest(number:<n>){ reviewThreads(first:50){ nodes{ comments(first:20){ nodes{ author{login} body path line } } } } } } }'
     ```
   - Review comments on lines: `gh api repos/misty-step/volume/pulls/<n>/comments`
   - General comments (Claude bot, CodeRabbit): `gh api repos/misty-step/volume/issues/<n>/comments`

   For each finding: fix (in scope), defer (out of scope → new file in
   `backlog.d/`), or reject with reasoning. Commit with Conventional Commits
   (`fix: address review feedback`). Lefthook validates.

6. **Async settlement** — push, then `gh pr view <n> --json statusCheckRollup,reviews`
   until merge-gate settles and bot re-reviews land.

7. **Merge-readiness verification** — `gh pr checks <n>` all green, all three
   comment endpoints clean, `reviewDecision = APPROVED` (or bot reviews
   resolved, if human approval is not required by branch protection).

**Exit gate:** merge-gate green, every review thread addressed, merge-readiness verified.

If already green and settled, skip to Phase 2.

### Phase 2: Polish — Elevate quality

**Goal:** Get from "works" to "exemplary."

1. **Hindsight review** — read the full diff. Volume-specific checks:
   - Every Convex mutation verifies `ctx.auth.getUserIdentity()` + ownership
   - Exercise deletion uses `deleteExercise` (soft delete via `deletedAt`)
   - History views pass `includeDeleted: true`
   - No relative imports inside `convex/` — use `@/lib/...` alias
   - API routes use `createChildLogger({ route })`, never `console.*`
   - Convex runtime uses `console.warn` (cannot import `@/lib/logger`)
   - No shallow modules, pass-through layers, temporal decomposition
   - Tests assert behavior, not implementation; Convex tests use time-window
     assertions, not fake timers

2. **Architecture edits** — fix what hindsight and `/code-review` find. Commit.

3. **Test audit** — coverage gaps via `bun run test:coverage`, brittle tests,
   missing edge cases (soft-delete restore, auth-identity mismatch, Stripe
   mode-dependent params). Fix.

4. **Docs** — refresh stale ADRs (`docs/adr/`), `docs/api-contracts.md`,
   `ARCHITECTURE.md`, postmortem references, CLAUDE.md pitfall table entries.

5. **Confidence assessment** — explicit deliverable with evidence.

**Exit gate:** architecture clean, tests solid, docs current, confidence stated.

If polish generates changes, return to Phase 1.

### Phase 3: Refactor — Reduce complexity

Invoke `/refactor` for this branch as the simplification engine.

**Goal:** Remove complexity that doesn't earn its keep.

1. **Run refactor pass** — rely on base-branch auto-detection; pass
   `--base master` only if ambiguous.
2. **Select one bounded change** — deletion > consolidation > state reduction
   > naming clarity > abstraction. Watch for shallow `useDashboard`-style hook
   > pass-throughs and duplicated auth boilerplate in `convex/*.ts`.
3. **Implement + verify** — preserve behavior, run `bun run test` and
   `bun run quality:full`, commit.

**Mandatory when diff >200 LOC net.** For smaller diffs, Ousterhout manual
pass: shallow modules, information leakage, pass-throughs, compatibility shims.

**Exit gate:** no obvious complexity to remove, or explicit justification.

If refactor generates changes, return to Phase 1.

## Loop Until Done

```text
Phase 1 (fix) → Phase 2 (polish) → Phase 3 (refactor)
       ↑                                      │
       └──────── if changes pushed ───────────┘
```

Each phase that commits sends you back to Phase 1. Terminates when a full pass
produces no changes.

## Land Policy (Volume)

- Repo merges via **squash** — single-ticket branches, confirmed by the
  release-please workflow. Use `gh pr merge <n> --squash --auto`.
- `/land` only after: `gh pr checks <n>` green, all review threads resolved.
- Never `--admin`. Never force-push to master. Never direct-push to master.
- Never skip hooks. `git push --no-verify` is banned. `SKIP_QUALITY_GATES=1
git push` is the only authorized bypass and only for documented emergencies.
- Stripe webhook signature changes → pair with `bunx convex env set
STRIPE_WEBHOOK_SECRET ...` on prod before merge.
- Convex schema changes → migration path documented (see ADR-0002, ADR-0006),
  post-merge deploy plan written.
- Post-merge: release-please opens/updates the Release PR on master. Do NOT
  manually tag.

## Reviewer Artifact Policy

Upload screenshots/GIFs to draft GitHub release assets, embed download URLs in
PR comments. Convert `.webm` → `.gif` (GitHub inlines GIFs, not video). Never
use `raw.githubusercontent.com` URLs (private repo breaks). Prefer CI artifacts
for generated output. Never commit binary evidence directly (use LFS or GitHub
releases).

## Flags

- `$ARGUMENTS` as PR number — target specific PR
- No argument — uses current branch's PR

## Anti-Patterns

- Declaring "done" while merge-gate is still running
- Reading only one of the three comment endpoints (Claude bot lives on
  `/issues/<n>/comments` — easy to miss)
- **Truncating review comments** — reading 300-char previews from `gh pr view`
  instead of full bodies. Run `skills/settle/scripts/fetch-pr-reviews.sh <n>`
  to pull complete comments across all three endpoints in one pass.
- Reflexive dismissal of bot reviews with "by design" without steelmanning
- Batch-reply instead of addressing each thread inline
- Polish without re-running `bun run quality:full`
- Refactoring without `bun run test` passing
- Using `--admin` to bypass merge-gate
- Merging without confirming `mergeStateStatus` is clean
- Hard-deleting exercises (always soft delete)
- Forgetting `includeDeleted: true` on history views
- Adding `console.error` in API routes (use `createChildLogger`)
- Importing `@/lib/logger` inside `convex/` runtime

## Output

Report per phase:

- **Fix:** conflicts resolved, merge-gate failures fixed, review comments
  addressed (count + dispositions across all three endpoints)
- **Polish:** architecture changes, test gaps filled, confidence + evidence
- **Refactor:** complexity removed (LOC delta, modules consolidated)
- **Final:** PR URL, `gh pr checks` status, merge readiness, residual risks,
  post-merge deploy plan if Convex/Stripe touched
