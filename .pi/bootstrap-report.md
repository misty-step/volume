# Pi Bootstrap Report — Volume

## Scope

Bootstrap a minimal, repo-local Pi foundation that supports explore -> design -> implement -> review loops while staying aligned with real project constraints.

## Lane evidence used

- **[repo-scout]** confirmed stack/workflow reality:
  - Bun-driven scripts in `package.json`
  - Strong local gates in `.lefthook.yml` (coverage + build on pre-push)
  - Lean CI in `.github/workflows/ci.yml` (lint/typecheck/test only)
- **[context-bridge]** highlighted high-signal context sources:
  - `CLAUDE.md` pitfalls + runbook
  - `project.md` locked directions for agentic pivot
  - `.groom/plan-2026-02-23.md` as decision-memory signal
- **[docs-research]** reinforced practical verification patterns:
  - Prefer scoped Vitest runs (`test:affected`) for iteration
  - Use Convex local testability (`convex-test`) and type-sync awareness when backend contracts shift
- **[workflow-critic]** flagged drift/safety risks to account for in review posture:
  - Doc-vs-reality mismatches (e.g., bypass and threshold claims)
  - Coverage/build/security enforcement gaps between local hooks and CI

## Adopt / bridge / ignore summary

### Adopted

1. Three-agent overlay model (planner/worker/reviewer) with explicit success contracts.
2. Prompt-driven loop (`/discover`, `/design`, `/deliver`, `/review`) for reusable agentic execution.
3. Repo-specific pipelines keyed to real change surfaces:
   - default feature delivery
   - coach runtime hardening
   - integration safety lane

### Bridged

1. Local quality-gate reality into pipeline verification contracts (Bun + Lefthook commands).
2. Agentic pivot constraints from `project.md` into planning/design prompts.
3. Ops safeguards (`verify-env.sh`) into integration pipeline checks.

### Intentionally not overbuilt

1. No rigid script orchestration layer; pipelines define contracts, not brittle automation.
2. No speculative extra agents; current team topology keeps maintenance low.
3. No package/extension coupling in local settings; prompt allow-list is the explicit local opt-in.

## Why this is minimal high-leverage

- **Repo-specific:** every pipeline maps to observed code/workflow boundaries.
- **Focused:** local prompt allow-list provides auditable intent in `.pi/settings.json`.
- **Agentic:** prompts + overlays + teams/pipelines implement the full loop.
- **Practical:** role/objective/success contracts avoid rigid step scripts.
- **Safe:** verification contracts mirror local gates and integration checks.
