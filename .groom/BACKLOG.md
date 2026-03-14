# Backlog Ideas

Last groomed: 2026-03-14

## High Potential (promote next session if capacity)

- **Coach workbench** — Developer surface for block catalog inspection, tool manifest review, and live turn trace debugging. Source: #349 (demoted). Revisit after json-render migration settles and observability is in place.
- **`@convex-dev/agent` adoption** — First-party Convex agent framework with persistent threads, delta streaming, memory search. Currently pre-1.0 (v0.3.2) with open data-corruption bugs. Revisit when it hits 1.0. Source: 2026-03-14 /groom architecture critique.
- **Radical restructuring: proactive agent runtime** — Server-side agent that runs on schedule, maintains working memory, generates morning briefings autonomously. Requires stable reactive coaching foundation first. Source: 2026-03-14 /groom Phase 2.5 Option 3.
- **Exercise knowledge graph** — Replace per-request LLM classification with embeddings + canonical taxonomy. Convex vector search. Source: 2026-03-14 /groom Track C.
- **Automated QA regression tests** — Convert manual QA harness into automated regression suite. Source: #408 (demoted).

## Someday / Maybe

- **44px touch target audit** — Systematic pass to ensure all coach UI elements meet 44px minimum. Will likely be addressed naturally during json-render migration. Source: #389 (demoted).
- **Exercise dedup pipeline** — Background job that detects near-duplicate exercises ("Bench Press" / "Flat Bench Press") and suggests merges. Source: 2026-03-14 /groom Track C.
- **Multi-client sync** — Same coach conversation visible across devices simultaneously. Requires `@convex-dev/agent` or equivalent. Source: 2026-03-14 /groom research.
- **Muscle recovery heat map** — Fitbod-style body visualization showing muscle freshness per group. Source: Track A reference architecture research.
- **Accent color exploration** — Explore beyond safety-orange. Needs dedicated design sprint. Source: 2026-02-23 /groom (deferred).

## Research Prompts

- **Mastra Observational Memory vs custom observer** — How much of Mastra's compression quality comes from the framework vs the prompt pattern? Could we replicate the observer/reflector with raw LLM calls in Convex actions?
- **json-render + tool results hybrid** — Our tools return structured data (deterministic). json-render expects the LLM to generate UI specs. What's the right integration pattern? Tools return data, model generates spec from data using catalog?
- **Cost modeling for user memory extraction** — Each turn runs a post-turn LLM call to extract facts. At what usage level does this become a cost concern? What's the cheapest model that can reliably extract facts?

## Archived This Session

_(none — first BACKLOG.md creation)_
