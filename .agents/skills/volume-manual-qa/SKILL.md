---
name: volume-manual-qa
description: |
  Manual QA regression pass for the Volume app.
  Validates critical user flows: health, auth, paywall gate behavior, today workspace,
  and coach composer send behavior with evidence artifacts.
  Use when: before PR, after auth/subscription/coach changes, or when users report flow breakage.
allowed-tools: Bash(agent-browser:*), Bash(curl:*), Bash(jq:*), Bash(bun:*)
---

# volume-manual-qa

Run a reproducible manual QA pass focused on real user journeys.

## Objective

Verify that core experiences are intact and produce artifact-backed evidence.

## Critical Flows (P0)

1. Health endpoint is up and reports pass.
2. Authenticated test user can sign in.
3. Signed-in user is not trapped in paywall redirect loop.
4. `/today` loads for authenticated user.
5. `/coach` loads for authenticated user.
6. Coach composer can enable `Send` after typing and submit a prompt.
7. Coach output semantically matches the message intent (`show today summary`).
8. Browser runtime has no uncaught page errors.

## Preconditions

- `.env.local` includes:
  - `CLERK_TEST_USER_EMAIL`
  - `CLERK_TEST_USER_PASSWORD`
- `agent-browser` and `jq` are installed locally.
- Local app can run on `http://localhost:3000`.
- Use a dedicated test user.

## Run

```bash
bash .agents/skills/volume-manual-qa/scripts/run-volume-manual-qa.sh
```

Optional custom output directory:

```bash
OUTPUT_DIR=/tmp/volume-manual-qa-custom bash .agents/skills/volume-manual-qa/scripts/run-volume-manual-qa.sh
```

## Expected Outcomes

- Script exits `0`.
- Report is generated at: `{OUTPUT_DIR}/report.md`
- Screenshots include:
  - `signin.png`
  - `post-login.png`
  - `today.png`
  - `coach.png`
  - `coach-after-send.png`
- Logs include:
  - URL checkpoints (`post-login-url.txt`, `today-url.txt`, `coach-url.txt`)
  - semantic payload (`coach-response.json`)
  - `console.txt`
  - `errors.txt`

## Failure Policy

- Any P0 flow failure is release-blocking.
- If auth succeeds but route redirects to `/pricing?reason=expired`, treat as access setup failure.
- Known non-blocking dev noise (e.g. Clerk dev warnings, CSP-blocked PostHog scripts) should be documented, not silently ignored.
