# Fix Stripe API version and restore quality gates

Priority: critical
Status: done
Estimate: S

## Goal

Restore passing typecheck and build by fixing the Stripe API version mismatch introduced in f00a181, and address the Next.js middleware deprecation warning.

## Non-Goals

- Upgrade the Stripe SDK to support a newer API version
- Rewrite the middleware — just migrate the file convention
- Change any Stripe integration behavior

## Oracle

- [x] `bun run typecheck` exits 0
- [x] `bun run build` exits 0 with no deprecation warnings about "middleware" convention
- [x] `bun run test --run` exits 0
- [x] Stripe API version in config files matches the version supported by installed `stripe` package
- [x] `grep -r "2026-02-25" src/ convex/` returns no results

## Notes

### Root Cause

Commit f00a181 (`[codex] improve repo readiness and hook setup`) manually bumped
`STRIPE_API_VERSION` from `"2026-01-28.clover"` to `"2026-02-25.clover"` in two files
without upgrading the `stripe` npm package. The installed `stripe@20.3.1` only supports
up to `"2026-01-28.clover"` (see `node_modules/stripe/types/ApiVersion.d.ts`).

### Fix

1. Revert version string in both files to `"2026-01-28.clover"`:
   - `src/lib/stripe/config.ts:1`
   - `convex/lib/stripeConfig.ts:3`
2. Update test mocks in `src/lib/stripe/server.test.ts` (lines 23, 52)
3. Migrate `src/middleware.ts` to `src/proxy.ts` per Next.js 16 convention (90 lines, auth + CSP headers)

### Prevention

Add a CI check or test that asserts `STRIPE_API_VERSION` matches the installed
package's supported version, so future mismatches fail fast.

## Touchpoints

- `src/lib/stripe/config.ts`
- `convex/lib/stripeConfig.ts`
- `src/lib/stripe/server.test.ts`
- `src/middleware.ts` → `src/proxy.ts`

## What Was Built

1. Reverted `STRIPE_API_VERSION` from `"2026-02-25.clover"` to `"2026-01-28.clover"` in both
   config files and test mocks (4 edits across 3 files)
2. Renamed `src/middleware.ts` → `src/proxy.ts` (Next.js 16 convention), updated vitest coverage exclusion
3. Added two drift prevention tests in `src/lib/stripe/config.test.ts`:
   - Asserts `STRIPE_API_VERSION` matches installed `stripe` package's `ApiVersion` (reads `node_modules/stripe/types/ApiVersion.d.ts`)
   - Asserts `STRIPE_API_VERSION` in `src/lib/stripe/config.ts` matches `convex/lib/stripeConfig.ts`
4. All quality gates pass: typecheck, lint (0 warnings), build (no middleware deprecation), 1503 tests
