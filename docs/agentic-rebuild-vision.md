# Agentic Rebuild Vision

Date: 2026-02-16
Status: Proposed

## Goal

Rebuild Volume as an agent-first product where chat is the primary interface and UI is generated per task, per turn.

## Product Thesis

People should not navigate forms to log training.
They should describe intent in natural language and get immediate action + context.

Examples:

- "10 pushups" logs the set, updates totals, shows trend, surfaces coaching insight.
- "Switch me to kg" updates preference and confirms it.
- "How am I doing on pullups this month?" returns a focused report with suggested next actions.

## North-Star Experience

1. One input box for most workflows.
2. Agent executes tools against deterministic backend state.
3. Response renders dynamic components (not just text): status, metrics, trend charts, comparisons, action chips.
4. Follow-ups maintain context and refine analysis without manual navigation.
5. Reliability model: deterministic metrics + AI narrative, never AI-invented numbers.

## Design Principles

1. Chat-first, not chat-bolted-on.
2. Deterministic truth in Convex; AI adds planning and explanation.
3. Actions must be idempotent and observable.
4. Every agent turn should reduce user effort.
5. Prototype velocity first, hardening second.

## System Shape

### Interface Layer

- `/coach` as primary app route for training workflows.
- Message timeline with generated component blocks.
- Suggested follow-up chips drive conversational depth.

### Agent Orchestration Layer

- Intent/tool loop (initially deterministic + heuristic; later LLM planner).
- Tool catalog: `log_set`, `create_or_match_exercise`, `get_today_summary`, `get_exercise_trend`, `update_user_setting`.
- Explicit confirmation for destructive/high-risk actions.

### Data + Compute Layer

- Convex remains source of truth.
- Existing set/exercise/user mutations and analytics reused first.
- New summary/trend composition logic built as deep modules.

### Rendering Layer

- Structured response blocks: status, metrics, trend, insights, suggestions.
- Catalog-based rendering constraints to prevent arbitrary UI drift.

## Roadmap Phases

### Phase 1: Prototype (speed)

- Working `/coach` chat flow with real logging + summary + trend components.
- Deterministic intent parser and tool execution.
- Demoable end-to-end conversational loop.

### Phase 2: Productization (quality)

- Stronger intent/planning with model-based orchestrator.
- Robust evals (tool success rate, correction rate, fallback rate).
- Better memory/state handling and conflict resolution.
- Security, abuse controls, observability, and UX refinements.

### Phase 3: Coach Intelligence

- Deeper contextual coaching plans.
- Periodized recommendations, adherence feedback, recovery-aware nudges.
- Multi-turn planning with explicit goals and constraints.

## Non-Goals (Prototype Phase)

- Complete replacement of all existing pages.
- Final visual design system polish.
- Complex multi-agent autonomy.
- Perfect natural-language understanding.

## Success Criteria

Prototype is successful if:

1. A user can log workouts and update key settings through chat alone.
2. Each core action returns meaningful generated UI, not plain text only.
3. The flow is compelling enough to demo and iterate quickly.
