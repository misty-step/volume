# Spec: 010 BYOK, Open-Source, API-First Pivot Recommendation

Date: 2026-04-23
Status: Recommended direction
Backlog: `backlog.d/010-evaluate-byok-open-source-api-first-pivot.md`

## Decision Summary

Volume should make a selective pivot: **go hybrid API-first, do not abandon the
hosted session app**.

The next product wedge should be a public domain-action HTTP API with an
OpenAPI contract, a thin MCP adapter over that API, and BYOK through
OpenRouter-compatible model configuration. The current coach route should become
one client of the same domain actions, not the canonical product surface.

This is a go for an API-first wedge and a no-go for a full rewrite into a
generic open-source backend. The hosted web app remains the reference client and
the revenue path. The open-source/self-host story should prove parity against
the public API before replacing infrastructure.

## Premise Challenge

The backlog item frames three pivots as one: BYOK, open source, and API-first.
They solve different problems:

- API-first solves integration and programmability.
- BYOK solves model-cost ownership, provider control, and self-host viability.
- Open source solves trust, inspectability, and deployment control.

Bundling them into one rewrite would produce the highest-risk version of each.
The narrow wedge is to expose Volume's existing deterministic workout actions as
one public contract, then make the coach, MCP server, and self-host build consume
that contract.

## Recommended Target Architecture

```text
Clients
  Web app / CLI / mobile / MCP host
        |
        v
Public API contract: OpenAPI + domain actions
        |
        v
Action runtime: auth principal, rate limit, validation, audit
        |
        v
Convex domain functions: exercises, sets, analytics, memories
        |
        v
External adapters: OpenRouter-compatible model provider, Stripe, Canary
```

### Load-Bearing Decisions

| Question                  | Recommendation                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Canonical product surface | Domain actions over HTTP, not the chat route                                                    |
| MCP boundary              | Thin adapter over the HTTP API and OpenAPI schema                                               |
| BYOK meaning              | User-owned OpenRouter-compatible key first; direct provider keys later only if demand is proven |
| Clerk long-term           | Hosted auth adapter, not domain-core infrastructure                                             |
| Convex long-term          | Keep for the wedge; use self-host Convex for OSS parity before considering a database rewrite   |
| Stripe long-term          | Hosted SaaS billing only; excluded from the self-host core path                                 |

## Structurally Distinct Options

### Option A: Keep Session-First SaaS

Keep `POST /api/coach` as the main product interface and only add web UX polish.

- Pros: Smallest implementation.
- Cons: Does not satisfy the API-first or self-host goals. External clients
  must impersonate browser sessions or bypass product logic.
- Failure mode: Volume stays useful as an app but not as programmable fitness
  infrastructure.

### Option B: Public API Wedge Over Current Stack

Add `/api/v1/*` routes in Next.js that authenticate a principal, call a shared
domain-action runtime, and delegate persistence to Convex. Keep the web coach
and Stripe flows.

- Pros: Proves programmable demand with the least churn. Reuses existing Convex
  ownership checks, Zod tool schemas, OpenRouter runtime, and quality gates.
- Cons: Requires careful boundary extraction so coach tools do not become a
  second API surface.
- Failure mode: If developer demand is weak, the hosted app remains intact.

### Option C: Full Open-Source Backend Rewrite

Replace Convex/Clerk/Stripe assumptions with a Postgres/SQLite-first backend and
make SaaS a hosted deployment of that core.

- Pros: Strongest conventional self-host story.
- Cons: Violates the non-goal of not rewriting the current app. Reimplements
  realtime sync, auth ownership, crons, Stripe subscription state, and existing
  Convex tests.
- Failure mode: Long rewrite with little user-facing progress.

### Option D: MCP-First Product

Expose Volume primarily through an MCP server and let agents be the product
interface.

- Pros: High agent-distribution upside.
- Cons: Remote MCP auth is more complex than ordinary HTTP auth, and non-agent
  clients still need a plain API.
- Failure mode: The protocol boundary becomes the product boundary before the
  domain contract is stable.

**Chosen:** Option B. It fails softly, keeps the app shippable, and creates the
shared contract needed for MCP and self-hosting.

## Auth Models For Machine Access

### 1. Clerk User API Keys

Use Clerk's machine-auth API keys for hosted `/api/v1/*` routes. Next.js
handlers call `auth({ acceptsToken: "api_key" })` or accept both session and
API-key tokens where needed. The returned `userId` becomes the Volume principal.

- Pros: Fits current Clerk dependency, supports revocation and scopes, keeps
  `users.clerkUserId` mapping intact, shortest path for hosted SaaS.
- Cons: Paid/usage-metered Clerk feature; self-host still needs an alternative.
- Best fit: Managed SaaS API keys.

### 2. Clerk OAuth / M2M Tokens

Use OAuth tokens for server-to-server integrations or organization-owned apps.

- Pros: Better fit for third-party apps that need delegated scopes and token
  lifetimes.
- Cons: More ceremony than a solo lifter's API key. Does not solve self-host
  without Clerk.
- Best fit: Later B2B or organization integrations.

### 3. First-Party API Keys In Convex

Create a `userApiKeys` table with hashed key material, scopes, labels,
last-used metadata, and revocation state. Next.js verifies the key, then calls
Convex under a server-side principal.

- Pros: Works in self-host, fully controlled, no Clerk feature coupling.
- Cons: Must build secret generation, hashing, partial display, revocation,
  abuse controls, and scope enforcement correctly.
- Best fit: Self-host profile and fallback if Clerk API-key cost/fit fails.

### 4. Bring Your Own OIDC Provider

Let self-host operators configure OIDC and map external subjects to Volume
users.

- Pros: Enterprise-friendly and avoids app-managed long-lived keys.
- Cons: Too much setup for the initial open-source wedge.
- Best fit: Later self-host hardening.

**Recommendation:** Use Clerk API keys for the first hosted API. Define a narrow
`Principal` interface immediately so self-host can swap in first-party API keys
without changing domain actions:

```ts
type Principal = {
  userId: string;
  authProvider: "clerk_session" | "clerk_api_key" | "first_party_api_key";
  scopes: readonly string[];
};
```

## Deployment Models

### 1. Managed SaaS

Vercel + Convex Cloud + Clerk + Stripe remains the production product.

- Pros: Current app already works this way. Stripe/Clerk/Convex integrations
  stay supported. Fastest path to revenue.
- Cons: Not a credible self-host answer by itself.

### 2. Self-Hosted Reference

Docker Compose for Next.js plus self-host Convex backend, with a generated
`.env.example.self-host` and first-party API keys. Stripe is disabled by
default. BYOK is required for model calls.

- Pros: Uses Convex's self-hostable backend and preserves domain parity.
- Cons: Convex self-hosting requires multiple services and persistent storage;
  it is not as simple as a single SQLite binary.

### 3. Split Core Package

Extract pure domain logic into a separate package, backed by Convex in SaaS and
a different database in self-host.

- Pros: Long-term portability.
- Cons: Premature until the HTTP contract has users.

**Recommendation:** Ship model 1 plus a documented model 2. Do not start model
3 until API traction proves the need.

## BYOK Model Strategy

### Recommended Phase 1: OpenRouter-Compatible BYOK

Users can provide a key that talks to OpenRouter's API surface. In hosted SaaS,
that key is encrypted per user and used for that user's coach/model calls. In
self-host, `OPENROUTER_API_KEY` and `COACH_AGENT_MODEL` remain environment
configuration.

This preserves ADR-0008's central point: one model gateway and one fallback
policy surface. It also lets power users use OpenRouter's provider-key feature
inside their own OpenRouter account.

### Deferred Phase 2: Direct Provider Keys

Support direct OpenAI, Anthropic, Google, or local OpenAI-compatible providers
only after the API contract is stable. The AI SDK supports OpenAI-compatible
provider instances with custom `apiKey` and `baseURL`, so this should be an
adapter expansion, not a new product architecture.

### Secret Storage Requirements

Hosted BYOK must not store raw provider keys in Convex. Store:

- encrypted key material
- provider type
- key fingerprint / last 4 characters
- verification status
- created, rotated, last-used, and revoked timestamps

The encryption key must live outside the encrypted rows. Prefer envelope
encryption with a platform secret or cloud KMS-equivalent for hosted SaaS. For
self-host, document the weaker env-key mode plainly.

Fallback policy must be explicit:

- `byok_only`: fail when the user key fails or rate-limits.
- `managed_fallback`: fall back to Volume's managed OpenRouter key when the
  user's subscription allows it.

Default to `byok_only` for self-host and `managed_fallback` only for hosted
plans where Volume accepts the cost.

## Public API Boundary

The public API should be a stable domain API, not a mirror of coach tools.
The existing `src/lib/coach/tools/schemas.ts` is a strong seed, but the package
name and ownership are wrong for a public contract.

### Proposed Module Boundary

```text
src/lib/domain/actions/
  schemas.ts       Zod contracts for public inputs and outputs
  registry.ts      action names, scopes, and runner bindings
  execute.ts       validate -> authorize -> run -> audit

src/app/api/v1/
  actions/[name]/route.ts
  openapi.json/route.ts

src/lib/coach/tools/
  adapters from model tool calls to domain actions
```

### Initial HTTP Surface

| Capability                 | Endpoint                               | Scope             |
| -------------------------- | -------------------------------------- | ----------------- |
| Log one or more sets       | `POST /api/v1/actions/log_sets`        | `sets:write`      |
| Edit/delete a set          | `POST /api/v1/actions/modify_set`      | `sets:write`      |
| Read workout history       | `POST /api/v1/actions/query_workouts`  | `sets:read`       |
| Read exercise metrics      | `POST /api/v1/actions/query_exercise`  | `exercises:read`  |
| Manage exercises           | `POST /api/v1/actions/manage_exercise` | `exercises:write` |
| Read settings/subscription | `GET /api/v1/me`                       | `profile:read`    |
| OpenAPI document           | `GET /api/v1/openapi.json`             | public            |

Command-style endpoints are intentional for v1 because the current domain
already has action-shaped operations with discriminated unions. Resource-shaped
REST endpoints can be layered on later when the action contract is stable.

### OpenAPI

Generate OpenAPI from the same Zod schemas used by runtime validation. Do not
hand-maintain a second schema. OpenAPI describes the HTTP and security contract;
it should not describe onboarding, billing, or key-exchange workflows.

### MCP

MCP should be a translation layer:

```text
MCP tool call -> local auth token -> HTTP API action -> typed result
```

Remote MCP adds OAuth protected-resource requirements. Do not ship remote MCP
before `/api/v1/*` has explicit scopes, 401/403 behavior, and auth metadata.
Local/self-host MCP can be simpler because the operator controls the API key.

## Current System Keep / Change / Delete

### Convex

Keep Convex as the domain data and mutation layer for this wedge. It already
owns auth checks, ownership checks, soft delete, realtime data, rate limits,
crons, and subscription state.

Change Convex-facing code to accept a resolved `Principal` from the API layer
where needed, without weakening existing `ctx.auth.getUserIdentity()` checks in
browser-session paths. Do not rewrite to Postgres until the API has real usage.

### Clerk

Keep Clerk for hosted human auth and hosted API keys. Change it from "the
identity model" to "one identity adapter." Long term, self-host must support
first-party API keys or OIDC without Clerk.

### Stripe

Keep Stripe only in managed SaaS. The self-host profile should compile and run
without Stripe keys and should omit billing routes/paywall behavior by default.
Do not make self-host depend on Stripe for core logging, history, or coach.

### Current Coach Route

Keep `POST /api/coach` as the web coach transport and presentation stream.
Change planner tools to call domain actions through an adapter. Delete legacy
tool definitions only after persisted sessions and compatibility tests prove
they are no longer needed.

## Phased Migration Plan

### Phase 0: Decision Artifact

- Land this spec.
- Mark backlog item 010 complete.
- Do not change runtime behavior.

### Phase 1: Domain Action Contract

- Move canonical tool schemas to `src/lib/domain/actions/schemas.ts`.
- Keep coach imports working through adapters.
- Add action metadata: name, scopes, idempotency support, audit category.
- Add contract tests that execute Zod validation and Convex calls through the
  public action runtime.

### Phase 2: Hosted HTTP API

- Add `/api/v1/actions/[name]`.
- Accept Clerk session tokens and Clerk API keys.
- Add per-scope authorization, rate limits, and structured error responses.
- Generate `GET /api/v1/openapi.json`.
- Update `docs/api-contracts.md`.

### Phase 3: BYOK OpenRouter Runtime

- Add encrypted per-user model credential storage.
- Add runtime selection: user OpenRouter key -> managed fallback only when
  policy allows.
- Add key verification and rotation flows.
- Update `/api/health` to report managed runtime and BYOK runtime separately
  without exposing secret state.

### Phase 4: MCP Adapter

- Add local/self-host MCP server as a thin wrapper over `/api/v1/*`.
- For remote hosted MCP, implement OAuth protected-resource metadata and scope
  challenges before public launch.

### Phase 5: Self-Hosted Profile

- Add Docker Compose and self-host env docs.
- Use self-host Convex as the default backend.
- Use first-party API keys or OIDC for auth.
- Disable Stripe/paywall by default.

## Go / No-Go Rubric

Go deeper on the pivot only if all are true after Phase 2:

- At least one non-web client can log sets, query history, and manage exercises
  entirely through `/api/v1/*`.
- The coach route uses the same domain action runtime as the public API.
- OpenAPI is generated from runtime schemas and is exercised in tests.
- Machine auth supports scoped read/write access without browser session
  assumptions.
- API usage produces clearer product value than simply improving the coach UI.

No-go on a full open-source/backend rewrite if any are true:

- Self-host requires replacing Convex before any external API user exists.
- Direct provider BYOK requires multiple provider SDKs before OpenRouter BYOK is
  proven insufficient.
- MCP requires protocol-specific business logic not shared with HTTP.
- Stripe/Clerk assumptions block local logging and history in a self-host build.

## Risks

1. **Boundary drift:** Coach tools and public API could become competing
   registries. Mitigation: one domain action registry; coach gets adapters only.
2. **Auth confusion:** Supporting session tokens and API keys can create
   inconsistent authorization. Mitigation: resolve every request to `Principal`
   before domain execution.
3. **Secret liability:** Hosted BYOK creates a new class of sensitive user data.
   Mitigation: envelope encryption, metadata, rotation, revocation, and clear
   fallback policy before launch.
4. **Convex self-host friction:** Convex is self-hostable but operationally
   heavier than SQLite. Mitigation: document the real service topology and do
   not sell self-host as zero-ops.
5. **MCP auth complexity:** Remote MCP has stricter authorization discovery
   expectations than a local adapter. Mitigation: ship local/self-host MCP after
   HTTP API; remote MCP later.

## Verification Plan

This spec changes no runtime code. The relevant verification is documentation
and formatting:

- `bun run lint`
- `bun run typecheck`
- `bun run architecture:check`
- `bun run test:affected`

Future implementation packets should additionally require:

- route tests for `/api/v1/*` auth, scopes, validation, and rate limits
- Convex tests for each domain action's ownership behavior
- OpenAPI generation tests that fail on schema drift
- Playwright or API smoke coverage for hosted API-key creation and use

## Context Sources

Internal repo anchors:

- `ARCHITECTURE.md`
- `docs/api-contracts.md`
- `docs/coach-agent-architecture.md`
- `docs/adr/ADR-0008-openrouter-model-portfolio.md`
- `src/app/api/coach/route.ts`
- `src/lib/coach/tools/registry.ts`
- `src/lib/coach/tools/schemas.ts`
- `src/lib/openrouter/policy.ts`
- `convex/schema.ts`
- `convex/auth.config.ts`
- `src/proxy.ts`

External primary sources checked on 2026-04-23:

- [OpenRouter BYOK documentation](https://openrouter.ai/docs/guides/overview/auth/byok)
- [Convex self-hosting documentation](https://docs.convex.dev/self-hosting)
- [Convex self-hosted guide](https://github.com/get-convex/convex-backend/blob/main/self-hosted/README.md)
- [Convex HTTP actions documentation](https://docs.convex.dev/functions/http-actions)
- [Clerk API-key machine-auth documentation](https://clerk.com/docs/guides/development/machine-auth/api-keys)
- [Clerk API-key verification in Next.js](https://clerk.com/docs/guides/development/verifying-api-keys)
- [AI SDK OpenAI-compatible provider documentation](https://ai-sdk.dev/providers/openai-compatible-providers)
- [AI SDK providers and models documentation](https://ai-sdk.dev/docs/foundations/providers-and-models)
- [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [OpenAPI security documentation](https://learn.openapis.org/specification/security.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

Second voice:

- Gemini CLI read-only architecture critique, 2026-04-23. It independently
  recommended a hybrid API-first architecture, Clerk as optional long-term
  adapter, Convex retained for parity, OpenRouter-only BYOK first, and MCP as a
  thin OpenAPI/HTTP adapter.
