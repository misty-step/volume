# Core Flows and Expected Behavior

This file defines the core experiences that must work for every ship decision.

## Public Entry

1. Open `/`.
2. Verify landing page renders without fatal errors.
3. Verify sign-in path is reachable.

Expected:

- App shell loads.
- No crash or blank screen.

## Authentication

1. Open `/sign-in?redirect_url=<app-url>/coach` using the same base URL the QA runner targets (`http://127.0.0.1:3100` by default).
2. Sign in with `CLERK_TEST_USER_EMAIL` + `CLERK_TEST_USER_PASSWORD`.

Expected:

- Session is established.
- User reaches an authenticated route.

## Subscription/Access Gate

1. After sign-in, navigate to `/today` and `/coach`.

Expected:

- QA account with active access is not redirected to `/pricing?reason=expired`.
- If redirected, this is a P0 setup failure for authenticated QA.

## Today Workspace

1. Open `/today`.

Expected:

- Route loads for authenticated user.
- Core workspace shell is visible.

## Coach Workspace

1. Open `/coach`.
2. Confirm `Send` exists and starts disabled.
3. Type a prompt (`show today's summary`).
4. Confirm `Send` enables.
5. Click `Send`.
6. Validate semantic response for the same intent using authenticated `/api/coach`.

Expected:

- Composer transitions disabled -> enabled when input exists.
- Submit action succeeds (no uncaught page error).
- Coach response is not fallback/unavailable.
- `trace.toolsUsed` includes `get_today_summary`.
- `assistantText` is non-empty.

## Platform Health

1. Request `/api/health`.

Expected:

- `status` is `pass`.
- Includes `checks.coachRuntime`.

## Browser Stability

1. Collect console + page errors.

Expected:

- No uncaught runtime page errors.
- Document known non-blocking dev warnings separately.
