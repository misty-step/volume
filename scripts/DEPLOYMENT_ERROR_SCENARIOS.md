# Deployment Script Error Scenarios

This document covers failure modes for `scripts/deploy-observability.sh`, which
now configures Canary instead of Sentry.

## Required Secrets

`deploy-observability.sh` reads `~/.secrets` and requires:

- `CANARY_ENDPOINT`
- `CANARY_API_KEY`

Optional overrides:

- `NEXT_PUBLIC_CANARY_ENDPOINT`
- `NEXT_PUBLIC_CANARY_API_KEY`

If the public vars are omitted, the script falls back to the server values.

## Failure Modes

### Missing `~/.secrets`

Error:

```text
Error: ~/.secrets not found
```

Fix:

- Create `~/.secrets` with `chmod 600 ~/.secrets`.

### Missing Canary endpoint

Error:

```text
Error: CANARY_ENDPOINT not set in ~/.secrets
```

Fix:

- Add the base Canary URL, e.g. `CANARY_ENDPOINT=https://canary.example.com`.

### Missing Canary API key

Error:

```text
Error: CANARY_API_KEY not set in ~/.secrets
```

Fix:

- Add an ingest-only Canary API key.

### Invalid endpoint format

Error:

```text
Error: CANARY_ENDPOINT must start with http:// or https://
```

Fix:

- Use a fully-qualified URL for both server and public Canary endpoints.

### Vercel auth or CLI failure

Possible errors:

```text
Error: vercel CLI not found
Error: not logged in to Vercel
```

Fix:

- Install the Vercel CLI and authenticate with `vercel login`.
