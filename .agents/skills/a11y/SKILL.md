---
name: a11y
description: |
  Accessibility audit, remediation, and verification. WCAG 2.2 AA compliance.
  Three-agent protocol: audit (find issues) → remediate (fix them) → critique (verify fixes).
  Use when: "accessibility audit", "a11y", "WCAG", "screen reader",
  "keyboard navigation", "contrast check", "aria fix", "accessibility sprint",
  "audit accessibility", "fix accessibility", "a11y issues", "a11y check".
  Trigger: /a11y
argument-hint: "[audit|fix|verify] [route|component|--scope full]"
---

# /a11y

Audit, fix, and verify accessibility across Volume's Next.js 16 app router UI. WCAG 2.2 AA.

**Target:** $ARGUMENTS

## Execution Stance

You are the executive orchestrator.

- Keep severity decisions, scope tradeoffs, and final PASS/FAIL judgment on the lead model.
- Delegate audit, remediation, and critique to separate focused subagents.
- Prefer parallel exploration for independent checks; keep remediation sequential when fixes interact.
- Volume ships light + dark + system themes — every verdict must hold in all three.

## Routing

| Intent                   | Action                                                  |
| ------------------------ | ------------------------------------------------------- |
| `/a11y` or `/a11y audit` | Full triad: audit → remediate → critique                |
| `/a11y audit <target>`   | Audit only — read `references/audit.md`                 |
| `/a11y fix <target>`     | Remediate only — read `references/remediate.md`         |
| `/a11y verify`           | Critique recent changes — read `references/critique.md` |

Targets are Volume surfaces: `src/app/(app)/today`, `src/app/(app)/coach`,
`src/components/dashboard/quick-log-form.tsx`, `src/components/subscription/paywall-gate.tsx`,
`src/app/(marketing)/page.tsx`, etc. If no sub-command, run the full triad below.

## Three-Agent Protocol

### Phase 1: Audit (read-only)

Launch an `a11y-auditor` Explore subagent. It does NOT fix anything.

**Automated scan:**

- Start the stack with `bun run dev` (Next.js + Convex) and scan via Playwright
  under `e2e/*.spec.ts` with `@axe-core/playwright` on tags `wcag2a`, `wcag2aa`, `wcag22aa`.
  Not yet in deps — add with `bun add -D @axe-core/playwright` if missing.
- `bun run lint` also runs — confirm `eslint-plugin-jsx-a11y` fires on touched files
  (Volume enforces `--max-warnings=0`).
- If no server, audit statically against `src/app/**`, `src/components/**`, `src/hooks/**`.

**Static analysis — grep for anti-patterns across `src/`:**

- `div onClick` / `span onClick` without `role` + `tabIndex` + `onKeyDown`
- `<img` without `alt=` (also inspect `next/image` usages)
- `<table>` without `<caption>` or `aria-label` (e.g. exercise history tables)
- `lucide-react` / `@radix-ui/react-icons` icon-only `<Button>` with no `aria-label`
- `<Input>` / `<Select>` from `src/components/ui/` without associated `<Label>` or `aria-label`
- `tabindex` values > 0
- `outline-none` / `outline: 0` without a `focus-visible:` replacement (Tailwind)
- Any emoji glyphs in UI — Volume bans them; replace with `lucide-react` SVG
- `border-l-4` + `rounded-*` combinations on cards — banned visual pattern

**Structural checks:**

- Landmarks in `src/app/(app)/layout.tsx` + `src/app/(marketing)/layout.tsx`:
  `<main>`, `<nav aria-label>`, `<header>`, `<footer>`
- Skip-to-content link as first focusable element on both route groups
- Focus management on SPA route change (dashboard ↔ coach ↔ history)
- `aria-required` + native `required` on quick-log form fields
  (`src/components/dashboard/quick-log-form.tsx`, `src/hooks/useQuickLogForm.ts`)
- `aria-sort` on sortable columns in history/analytics tables
- Radix `Dialog` focus restoration (exercise selector, edit muscle groups, paywall)
- `prefers-reduced-motion` honored by PR celebration + coach block animations
- `env(safe-area-inset-top)` applied to wordmark/header — never behind notch or dynamic island
- Paywall disabled controls convey WHY via `aria-describedby` pointing at plan copy,
  not just `disabled` + opacity

**Output:** structured findings as:

```
## [SEVERITY] WCAG [criterion]: [title]
File: src/components/.../foo.tsx:[line]
Issue: [what's wrong]
Fix: [specific change needed]
```

Ranked: blocker → high → medium → low (mapped to axe critical → serious → moderate → minor).

Read `references/audit.md` for the full protocol.

### Phase 2: Remediate (writes code)

Launch an `a11y-fixer` builder subagent with the audit findings.

**Priority order:**

1. Accessible names (blocker) — icon-only buttons in dashboard toolbar, coach composer send, theme toggle
2. Keyboard access (blocker) — every interactive block reachable via Tab; mobile compact mode usable with on-screen keyboard raised
3. Focus and dialogs (blocker) — Radix `Dialog` / `AlertDialog` / `Popover` trap + restore focus; don't override `onCloseAutoFocus`
4. Semantics (high) — native `<button>` over `role="button"`; use `src/components/ui/button.tsx` primitive
5. Forms and errors (high) — wire `react-hook-form` + `zod` errors via `aria-describedby`, keep `aria-invalid`
6. Announcements (medium) — `sonner` toasts must announce; coach streaming responses need `aria-live="polite"` on the block region
7. Contrast and states (medium) — accent color usage is restricted (data numbers, trend peaks, totals only) — verify 4.5:1 body / 3:1 UI in light, dark, system
8. Media and motion (low) — alt text on charts (`recharts`, `react-activity-calendar`, `react-body-highlighter`); `prefers-reduced-motion` on PR celebration
9. Tool boundaries (blocker) — surgical diffs; never refactor unrelated code

**Rules:**

- Native HTML over ARIA. `<button>` not `<div role="button">`.
- No emojis — `lucide-react` or `@radix-ui/react-icons` SVGs only.
- No single-side border on rounded cards; use background tint or leading icon.
- After each fix, run `bun run test:affected` (Vitest, `--related --run`) and re-run the relevant
  Playwright spec in `e2e/` with axe assertions.
- Every fix ships with a test — either `*.test.tsx` next to the component
  (see `src/components/dashboard/quick-log-form.test.tsx` pattern) or an assertion added to
  `e2e/critical-flow.spec.ts` / `e2e/coach-flows.spec.ts`.
- Defer medium/low issues only if timeline is tight — file under `backlog.d/<NNN>-a11y-<slug>.md`.

Read `references/remediate.md` for the full protocol.

### Phase 3: Critique (read-only, cold review)

Launch an `a11y-critic` subagent. **No shared context with the implementer.**

- Re-run axe scan on modified routes via Playwright.
- Cold keyboard pass: Tab / Shift-Tab / Enter / Space / Arrow through every modified surface,
  in both desktop and mobile (`DashboardMobile` vs `DashboardDesktop`) views.
- VoiceOver pass (Cmd+F5) on critical flows: quick-log → set logged toast → coach response.
- Verify parity across light, dark, and system themes (`next-themes`).
- Verify safe-area: capture with a notch viewport; wordmark must clear the status bar.
- Read the git diff + axe output independently.
- Verdict: **PASS** or **FAIL** with specific `file:line` issues.

Before merge: `bun run quality:full` + `bun run test:e2e` must be green.
If FAIL → back to Phase 2 with the critic's issues.

Read `references/critique.md` for the full protocol.

## Volume A11y Invariants

Non-negotiable, drawn from `CLAUDE.md`, `DESIGN_SYSTEM.md`, and design memory:

- No emojis in UI — SVG icons only (`lucide-react`, `@radix-ui/react-icons`).
- No single-side borders on rounded cards (`border-l-4` + `rounded-*`); use background tint or leading dot/icon.
- Wordmark respects `env(safe-area-inset-top)` — never behind notch/dynamic island.
- Theme parity: light, dark, system — contrast + focus-visible must hold in all three. No teal.
- Flush coach blocks: 0 gap + 0–4px radius, but keep semantics (landmarks, headings, lists) for screen readers.
- Accent color only on data (numbers, trend peaks, totals, 1–2 hero keywords). Decorative accent is banned — a clarity rule for screen-reader users as much as an aesthetic one.
- No pseudo-cursive / italic display fonts for hero headings (low-vision, dyslexia impact).
- No noise/grain or glow-halo backgrounds — they crush text contrast.
- Keyboard-aware mobile: every interactive block stays reachable and usable with the on-screen keyboard raised.
- Disabled control → always paired with `aria-describedby` or visible help text explaining why (esp. `paywall-gate.tsx`).

## Key Surfaces

| Surface         | Files                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Quick-log form  | `src/components/dashboard/quick-log-form.tsx`, `src/hooks/useQuickLogForm.ts`                                                                   |
| Dashboard shell | `src/components/dashboard/Dashboard.tsx`, `DashboardMobile.tsx`, `DashboardDesktop.tsx`                                                         |
| Coach composer  | `src/components/coach/CoachPrototype.tsx`, `CoachBlockRenderer.tsx`, `useCoachChat.ts`                                                          |
| Paywall         | `src/components/subscription/paywall-gate.tsx`, `trial-banner.tsx`                                                                              |
| Exercise CRUD   | `src/components/dashboard/exercise-manager.tsx`, `exercise-selector-dialog.tsx`, `inline-exercise-creator.tsx`, `edit-muscle-groups-dialog.tsx` |
| History / trend | `src/components/dashboard/chronological-set-history.tsx`, `exercise-sparkline.tsx`, `src/app/(app)/history`                                     |
| Landing         | `src/app/(marketing)/page.tsx` (left-aligned hero, Inter)                                                                                       |
| Auth            | Clerk components under `src/app/(marketing)/sign-in`, `sign-up`                                                                                 |
| App layouts     | `src/app/(app)/layout.tsx`, `src/app/(marketing)/layout.tsx`                                                                                    |

## Gotchas

1. **axe-core catches ~50–60% of issues** — never declare "accessible" from automated scans alone.
2. **Radix portals render outside the component tree** — jsdom-based Vitest misses portal content; `e2e/` Playwright catches it.
3. **SPA focus is invisible to axe** — focus-on-navigate, skip links, dialog focus restoration need manual keyboard verification.
4. **`aria-sort` on `<th>` is not enough** — the sort trigger must be a focusable `<button>` inside `<th>`.
5. **`opacity-50` on disabled controls** drops contrast below 4.5:1 — test disabled states explicitly (paywall CTA).
6. **Radix `Dialog` `onCloseAutoFocus` with `preventDefault()`** kills focus restoration — let Radix handle it.
7. **`aria-required` and HTML `required` serve different purposes** — use both on quick-log numeric fields.
8. **Don't wrap library-managed ARIA** — Radix / cmdk / `sonner` manage their own; verify, don't duplicate.
9. **`react-markdown` output in coach blocks** inherits heading levels from document context — ensure `<h1>` stays unique per route.
10. **Fixed headers can obscure focused elements** — WCAG 2.4.11 (use `scroll-margin-top`); relevant to sticky wordmark + coach composer bar.

## WCAG 2.2 New Criteria Quick Reference

| Criterion                 | Level | What to check                                                  |
| ------------------------- | ----- | -------------------------------------------------------------- |
| 2.4.11 Focus Not Obscured | AA    | Sticky wordmark / coach composer doesn't cover focused element |
| 2.4.13 Focus Appearance   | AAA   | Focus indicator >=2px, 3:1 contrast (all three themes)         |
| 2.5.7 Dragging Movements  | AA    | Any drag UI has non-drag alternative                           |
| 2.5.8 Target Size         | AA    | Interactive targets >= 24x24 CSS px (mobile quick-log buttons) |
| 3.2.6 Consistent Help     | A     | Help placement consistent across (app) and (marketing)         |
| 3.3.7 Redundant Entry     | A     | Don't re-ask for info in multi-step onboarding                 |
| 3.3.8 Accessible Auth     | AA    | Clerk flows — no cognitive function tests                      |

## Testing Stack

| Tool                                                | Layer  | When                                                                                        |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `eslint-plugin-jsx-a11y` (via `eslint-config-next`) | Lint   | `bun run lint` — pre-commit via Lefthook                                                    |
| Vitest `*.test.tsx`                                 | Unit   | `bun run test --run` / `bun run test:affected`                                              |
| `@axe-core/playwright` in `e2e/`                    | E2E    | `bun run test:e2e` (CI + targeted)                                                          |
| axe DevTools (Chrome)                               | Dev    | Manual spot-checks via Claude-in-Chrome MCP: navigate + inject axe + `javascript_tool` read |
| VoiceOver (macOS Cmd+F5)                            | Manual | Quick-log, paywall, coach composer critical flows                                           |
| Keyboard-only                                       | Manual | Every interactive change, desktop + mobile + keyboard-raised mobile                         |

## Hand-offs

- Blocker findings rooted in framework/UI library → `/diagnose`.
- Medium/low findings → `backlog.d/<NNN>-a11y-<slug>.md`.
- Verified PASS → `/settle` to land the PR.

## Ground Truth

- `/Users/phaedrus/Development/volume/DESIGN_SYSTEM.md` — visual tokens, spacing scale, theme semantics
- `/Users/phaedrus/Development/volume/CLAUDE.md` — design pitfalls table + commands
- `/Users/phaedrus/Development/volume/ARCHITECTURE.md` — surface map (dashboard → hooks → convex)
- `~/.claude/projects/-Users-phaedrus-Development-volume/memory/MEMORY.md` — design anti-patterns (border-color, emojis, notch-safe, teal, glow halos, flush blocks)
