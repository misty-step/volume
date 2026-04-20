---
name: yeet
description: |
  End-to-end "ship it to the remote" in one command. Reads the whole worktree,
  understands what's in flight, tidies debris, splits pending work into
  semantically-meaningful conventional commits, and pushes.
  Not a git wrapper — a judgment layer on top of git. Decides what belongs,
  what doesn't, and how to slice the diff into commits a reviewer can read.
  Use when: "yeet", "yeet this", "commit and push", "ship it", "tidy and
  commit", "wrap this up and push", "get this off my machine".
  Trigger: /yeet, /ship-local (alias).
argument-hint: "[--dry-run] [--single-commit] [--no-push]"
---

# /yeet

Take the Volume worktree state → one or more Conventional Commits → `origin`.
One command. Executive authority. No approval gates. Never on `master`.

## Stance

1. **Act, do not propose.** Stage what belongs, leave out what doesn't, delete
   debris, slice logically, push. Escalate only on red-flag state (see Refuse).
2. **Clean tree is the deliverable.** `/yeet` is not done while
   `git status --porcelain` shows modified, staged, or untracked paths. Every
   path is resolved by commit, ignore, move out of repo, or delete.
3. **Reviewability is the product.** Three focused commits beat one 2,000-line
   "wip" dump. Slice on semantic boundaries (schema vs UI vs coach vs docs)
   even when the tree was built in one session.
4. **Never lose work.** Untracked scratch that might be in-flight thinking
   gets moved, not deleted, unless it's unambiguous debris.
5. **Conventional Commits, always.** commitlint enforces
   `<type>(<scope>)?: <subject>`. Body explains _why_, not _what_.

## Modes

- Default: classify → slice → commit → push.
- `--dry-run`: report the plan (commit boundaries, messages, deletions), no execution.
- `--single-commit`: skip the split pass; one commit for everything signal-class.
- `--no-push`: commit locally, don't push. Use when the user wants to amend first.

## Process

### 1. Read the worktree holistically

- `git status --porcelain` — full picture of unstaged + untracked
- `git diff` + `git diff --staged` — actual content, not just names
- `git log --oneline -20 origin/master..HEAD` — what's already committed on this branch
- `git rev-parse --abbrev-ref HEAD` — branch name; never `master`
- `rg -n "WIP|TODO|FIXME|XXX|console\.log" --glob="!node_modules"` — debris to triage
- `git status` for any in-progress rebase/merge/cherry-pick (see Refuse)

If the tree is clean and `origin/<branch>` is current, say so and exit.

### 2. Classify every path

| Class           | Meaning                                                                                                                                                                                  | Action                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **signal**      | Work the user meant to do                                                                                                                                                                | Include in a commit                                                           |
| **debris**      | Volume session artifacts: `thinktank.log`, `coverage/`, `test-results/`, `playwright-report/`, `.next/`, `tsconfig.tsbuildinfo`, `/tmp/volume-*` scratch, `.DS_Store`, editor swap files | Delete; confirm it's already in `.gitignore` before touching                  |
| **drift**       | Unrelated edits from an earlier session                                                                                                                                                  | Separate commit, move out of repo, or durable ignore — never leave unresolved |
| **evidence**    | `INCIDENT-*.md`, postmortem drafts under `docs/postmortems/`                                                                                                                             | Commit — these are real docs                                                  |
| **scratch**     | Half-written planning notes, `.claude/worktrees/*` scratch                                                                                                                               | Move out of repo or delete if trivial                                         |
| **secret-risk** | Any `.env*` file, files containing plausible credentials (`sk-or-...`, Clerk keys, Stripe keys)                                                                                          | REFUSE — trufflehog pre-commit will trip anyway                               |

**Volume-specific heuristics:**

- `.env`, `.env.local`, `.env.production` → secret-risk. Refuse. Never commit.
- `bun.lock` / `bun.lockb` changes when only `package.json` touched → let lefthook
  autoformat/lint first; don't stage the lock by hand.
- `backlog.d/_done/*.md` — signal if the move is part of this branch's work.
- `CHANGELOG.md` — never edit manually; release-please owns it via Release PR.
- `.claude/worktrees/` scratch → scratch-class, move out or delete.
- New untracked dirs with only timestamped logs → debris; delete.

### 3. Group signals into semantic commits (Volume slice map)

Slice by domain — each slice is one commit:

- **Schema (`convex/schema.ts`)** → own commit. `feat(convex):` for additive,
  `refactor(convex):` for compatible reshape. Reference the relevant ADR under
  `docs/adr/` in the body when compatibility is non-trivial.
- **Convex functions** (`convex/*.ts` excluding schema) → `feat(convex): <topic>`
  or `fix(convex): <topic>`. Mutations + their tests ship together.
- **UI** (`src/components/**`, `src/app/**`) → `feat(ui):` or `fix(ui):`.
- **Coach tools** (`src/lib/coach/tools/**`) → own commit. Body should reference
  `docs/patterns/coach-tools.md` when introducing a new tool.
- **Tests only** (`src/**/*.test.ts`, `convex/**/*.test.ts`) → `test:`.
- **Docs only** (`CLAUDE.md`, `AGENTS.md`, `docs/**`, `ARCHITECTURE.md`,
  `DESIGN_SYSTEM.md`) → `docs:`.
- **Dep bumps** (`package.json`, `bun.lock`) → `chore(deps):`.
- **Architecture gate fixes** (`scripts/verify-architecture.ts`,
  `src/lib/architecture-checker.ts`) → `chore:` or `refactor:`.

**Rules:**

- Co-changed tests belong with the code they test — don't split.
- Config that enables a feature ships with the feature.
- Refactors before features when both exist in one diff (keeps bisect sane).
- Carmack's stapled-PR rule: if you'd describe it as "X and also Y," it's two commits.

`--single-commit` skips grouping; everything signal-class becomes one commit.

### 4. Write commit messages

commitlint-enforced format:

```
<type>(<scope>)?: <imperative subject under 72 chars>

<optional body: why, not what. Wrap at 72.>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`chore`. No `wip`, `misc`, `update`, `changes`.

**Scope:** match the convention in `git log --oneline -20`. Volume uses `convex`,
`ui`, `coach`, `deps`, plus free-form topics like `(auth)`, `(billing)`.

**Subject rules:** imperative ("add", not "added"); no trailing period; no PR
numbers unless Volume's recent log does it (it doesn't, as of `git log -20`).

**Bad:** `updated stuff`, `WIP`, `fix thing`, `misc changes`.
**Good:** `fix(coach): restore exerciseNotFoundResult helper usage`.

**Body:** explain the constraint / incident / why this choice over alternatives.
Don't restate the file-level diff. Always pass via HEREDOC per CLAUDE.md.

### 5. Stage, commit, push

1. `git fetch origin`
2. `git rev-parse --abbrev-ref HEAD` — abort if `master`.
3. If `origin/master` moved: `git rebase origin/master`. Hand-resolve
   `convex/schema.ts` conflicts, then `bunx convex dev` to re-verify.
4. Stage path-by-path (`git add <path>`) per slice — never `git add -A` at root.
5. Commit each slice with a HEREDOC message (CLAUDE.md pattern).
6. Allow `lefthook` pre-commit hooks to run (commitlint, trufflehog, format).
   **If a hook fails, fix the issue and create a NEW commit — never `--amend`**
   (the commit didn't happen; amend clobbers the prior commit).
7. Final local gate before push:
   `bun run typecheck && bun run lint && bun run test:affected`
8. `git push -u origin <branch>` (upstream tracking).
9. Lefthook pre-push will run:
   - `NODE_ENV=test CI=true bun run test:coverage` (thresholds 52/83/73/52)
   - `bun run security:audit` (high-sev audit)
   - `bun run architecture:check` (boundaries + cycles)
   - `bun run build` on feature branches
10. If push rejected (upstream moved), rebase-pull + retry once. Do NOT force-push.
11. Rerun `git status --porcelain`. Must be empty to exit.

### 6. Open the PR (post-push)

- `gh pr create --fill` or HEREDOC-bodied `gh pr create` per CLAUDE.md template.
- Title ≤70 chars, Conventional Commits prefix.
- Body: Summary (1–3 bullets) + Test plan (markdown checklist).
- Hand off to `/settle` once CI is green.

### 7. Report

Commits shipped (sha, type, subject). Paths deleted/ignored/moved and why.
Push target + result. PR URL if opened. Final worktree status.

## Refuse Conditions

Stop and surface to the user:

- `.git/MERGE_HEAD`, `.git/CHERRY_PICK_HEAD`, or `rebase-*` dir exists.
- Diff contains unresolved conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
- Any path classified `secret-risk` (`.env*`, Stripe `sk_live_*`, Clerk keys,
  OpenRouter `sk-or-...`, Convex deploy keys).
- Current branch is `master` — `/yeet` never pushes there. The repo blocks
  force-push to master; direct commits bypass the Release PR flow.
- HEAD is detached.
- `>500` files changed with no obvious semantic grouping — ask first.

## Safety rails (never)

- Never `git push --no-verify` (silently bypasses commitlint + pre-push gates).
- Never `git push --force` to `master` (repo rejects; don't try).
- Never `--amend` after a hook failure — create a new commit.
- Never `git add -A` at repo root without classifying first.
- Never `git clean -fdx` without per-file classification.
- Never commit under `.env*` — trufflehog will trip anyway, and the damage is done if you bypass.
- `SKIP_QUALITY_GATES=1 git push` is the emergency bypass only — document in the
  PR comment, and only for real incidents.

## Gotchas

- **"Tidy" is not refactor.** This skill stages and commits; it does not edit
  source. Messy diff → `/refactor`, not `/yeet`.
- **Match the Volume log, not a template.** Read `git log --oneline -20`.
  Volume's recent style: short subjects, scopes like `(convex)`, `(ui)`,
  `(coach)`, free-form topics acceptable.
- **Untracked dirs.** `.claude/worktrees/*`, `coverage/`, `playwright-report/`
  often have new dirs. Classify directory-by-directory.
- **Lefthook stage_fixed.** Formatters mutate files during commit — that's fine,
  they're in the commit. Don't panic and re-stage.
- **Schema rebase conflicts.** `convex/schema.ts` is a common conflict surface.
  Resolve by hand, then `bunx convex dev` to refresh the local deployment before
  committing the resolution.
- **bun.lock drift.** Don't stage `bun.lock` when you only touched `package.json`
  — let lefthook's `bun install` normalize it, then commit what it produced.
- **Co-author line.** Volume uses
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
  per CLAUDE.md. Match exactly.
- **Release-please PRs.** Never manually edit `CHANGELOG.md` or version strings
  in `package.json` — release-please owns those via its Release PR.
- **Push rejection on first try is usually benign.** Upstream moved. Rebase-pull
  - push once. If rejected again, stop.

## Output

```markdown
## /yeet Report

Classified 18 paths: 14 signal, 3 debris, 1 scratch.
Deleted: thinktank.log, coverage/, playwright-report/
Moved out of repo: .claude/worktrees/scratch-notes.md → ~/vault/volume/

Commits:
abc1234 refactor(convex): extract ownership-check helper
def5678 feat(coach): add set-suggestion tool
9012345 test(coach): cover suggestion edge cases
fed3210 docs: note coach-tool pattern in CLAUDE.md

Pushed feat/coach-suggestions → origin (4 new commits).
PR: https://github.com/misty-step/volume/pull/4XX
Worktree: clean
```

On refuse:

```markdown
## /yeet — REFUSED

Reason: .env.local staged; trufflehog pre-commit will trip on Clerk key at line 3.
Action: `git restore --staged .env.local` and confirm `.env*` is in .gitignore.
```
