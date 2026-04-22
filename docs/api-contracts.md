# API Contracts

Runtime-facing routes live under `src/app/api/` and `src/app/ingest/`.
This document records the stable contracts agents and contributors should rely
on before changing handlers or callers.

## Authentication Rules

- `GET /api/health` is public.
- `POST /api/coach` requires an authenticated Clerk session plus a Convex token.
- `POST /api/stripe/checkout` requires an authenticated Clerk session plus a
  Convex token.
- `POST /api/stripe/portal` requires an authenticated Clerk session plus a
  Convex token.
- `POST /api/test/reset` is non-production only and requires both auth and the
  `X-TEST-SECRET` header.
- `/ingest/[...path]` proxies PostHog traffic and does not perform app-level
  auth.

## `GET /api/health`

- Purpose: report operational readiness for uptime checks and deployment
  validation.
- Success status: `200` when all required checks pass.
- Failure status: `503` when any required check fails.
- Response shape:

```json
{
  "status": "pass | fail",
  "timestamp": "ISO-8601 string",
  "version": "string",
  "checks": {
    "clientRuntime": { "status": "pass | fail" },
    "convex": { "status": "pass | fail" },
    "stripe": { "status": "pass | fail" },
    "coachRuntime": { "status": "pass | fail" },
    "errorTracking": {
      "status": "pass | fail",
      "clientConfigured": "boolean",
      "serverConfigured": "boolean",
      "serverKeySource": "dedicated | public_fallback | missing"
    }
  }
}
```

- Invariant: responses are uncached with `Cache-Control: no-cache, no-store,
must-revalidate`.
- Production invariant: `checks.errorTracking.serverKeySource` must be
  `dedicated`; public-key fallback is only acceptable outside production.

## `POST /api/coach`

- Purpose: execute a coach turn and stream a UI response.
- Request body:

```json
{
  "messages": [
    { "role": "user | assistant | tool", "...": "transport fields" }
  ],
  "sessionId": "optional string",
  "preferences": {
    "unit": "lbs | kg",
    "soundEnabled": true
  }
}
```

- Validation invariants:
  - `messages` must contain at least one item.
  - `messages.length` must not exceed `MAX_COACH_MESSAGES`.
  - Serialized message payload must not exceed `200_000` bytes.
  - At least one user message must be present.
- Failure statuses:
  - `400` invalid JSON, invalid body, bad message format, too many messages
  - `401` unauthenticated or missing Convex token
  - `413` oversized payload
  - `429` rate limit exceeded
  - `500` handled planning/runtime failures
  - `503` coach runtime unavailable
- Invariant: the handler must never trust client-supplied history over persisted
  session data when server history is available.

## `POST /api/stripe/checkout`

- Purpose: create a Stripe Checkout session for the signed-in user.
- Request body:

```json
{
  "priceId": "required Stripe price id"
}
```

- Success status: `200` with `{ "url": "https://checkout.stripe.com/..." }`.
- Failure statuses:
  - `400` invalid JSON or missing `priceId`
  - `401` unauthenticated or missing Convex token
  - `500` missing required server configuration or Stripe failure
- Invariants:
  - Customer identity comes from server-side auth and Convex lookups, never
    from client-supplied user ids.
  - Remaining trial time is preserved only when Stripe's minimum lead time is
    satisfied.

## `POST /api/stripe/portal`

- Purpose: create a Stripe Billing Portal session for the signed-in user.
- Success status: `200` with `{ "url": "https://billing.stripe.com/..." }`.
- Failure statuses:
  - `400` account has no Stripe customer id
  - `401` unauthenticated or missing Convex token
  - `500` missing required server configuration or Stripe failure
- Invariant: the customer id is loaded server-side from Convex.

## `/ingest/[...path]`

- Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`
- Purpose: edge proxy for PostHog ingest and static assets.
- Success behavior: returns the upstream response body/status/headers with
  hop-by-hop headers removed.
- Failure statuses:
  - `502` upstream proxy failure
  - `504` upstream timeout
- Invariants:
  - Non-static ingest responses must be `cache-control: no-store`.
  - `set-cookie` is stripped from upstream responses.

## Non-Production Test Route

`POST /api/test/reset` exists only to reset authenticated E2E state outside
production. It must stay unavailable in production and must continue to require
an authenticated Clerk session, a Convex token, and the `X-TEST-SECRET`
header.
