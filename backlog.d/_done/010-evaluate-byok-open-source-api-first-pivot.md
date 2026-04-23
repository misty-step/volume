# Evaluate BYOK, open-source, API-first product pivot

Priority: high
Status: done
Estimate: M

## Goal

Time-box a 2-day shaping spike to determine whether Volume should pivot from a
session-first web app into a BYOK, open-source, API-first product, and produce
a concrete go/no-go recommendation with a migration outline.

## Non-Goals

- Execute the pivot in this item
- Rewrite the current web app, auth stack, or billing flows during exploration
- Produce a speculative 12-month roadmap with no architectural grounding
- Pretend self-hosting, BYOK, and managed SaaS all have the same operational cost

## Oracle

- [x] [behavioral] A context packet or spec exists under `docs/` describing the recommended target architecture
- [x] [behavioral] The exploration compares at least 3 auth models for machine access and recommends one
- [x] [behavioral] The exploration compares at least 2 deployment models for open-source/self-host use and recommends one
- [x] [behavioral] The exploration defines how BYOK works for model providers, secret storage, and fallback behavior
- [x] [behavioral] The exploration defines the public API surface ownership boundary: domain actions, HTTP API, OpenAPI, and MCP
- [x] [behavioral] The exploration includes a phased migration plan with explicit keep/change/delete decisions for Convex, Clerk, Stripe, and the current coach route
- [x] [behavioral] The exploration ends with a clear go/no-go rubric, major risks, and a recommended next step

## Notes

The current architecture is still centered on web-session auth and a chat route:
`src/app/api/coach/route.ts`, `src/proxy.ts`, `convex/auth.config.ts`, and the
Stripe routes all assume a human in the app. The repo also already contains the
right seed for an API-first surface in `src/lib/coach/tools/registry.ts` and
`src/lib/coach/tools/schemas.ts`.

This item is about deciding whether the product should become:

- a programmable fitness backend with a reference web client
- a hosted SaaS with optional API access
- or a hybrid where the managed product and the open-source/self-host story share one public contract

The recommendation must answer these questions directly:

- Should the canonical product surface be domain actions over HTTP, not the chat route?
- Should MCP be a thin adapter over that API or a first-class runtime boundary?
- Should BYOK mean OpenRouter-only, direct provider support, or both?
- Should Clerk remain core infrastructure, become an optional adapter, or be removed from the long-term target?
- Is Convex still the right core if the project wants a credible open-source/self-host story?

## Touchpoints

- `backlog.d/010-evaluate-byok-open-source-api-first-pivot.md`
- `docs/`
- `ARCHITECTURE.md`
- `README.md`
- `src/app/api/coach/route.ts`
- `src/lib/coach/tools/registry.ts`
- `src/lib/coach/tools/schemas.ts`
- `convex/auth.config.ts`
- `src/proxy.ts`
- `src/app/api/stripe/checkout/route.ts`

## What Was Built

- Added `docs/specs/010-byok-open-source-api-first-pivot.md` with the target
  architecture recommendation.
- Recommended a selective hybrid API-first pivot: public domain actions over
  HTTP/OpenAPI, MCP as a thin adapter, OpenRouter-compatible BYOK first, and
  self-host parity through Convex before any database rewrite.
- Compared four machine-auth models and three deployment models.
- Defined BYOK provider, secret-storage, and fallback behavior.
- Captured keep/change/delete decisions for Convex, Clerk, Stripe, and the
  current coach route.
- Added a phased migration plan, go/no-go rubric, risks, verification plan, and
  source list.
