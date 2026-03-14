# Verification

## Tests

RUN v3.2.4 <repo-root>

✓ src/lib/public-service-config.client.test.ts (4 tests) 4ms
✓ src/lib/stripe/config.test.ts (6 tests) 19ms
✓ src/lib/sentry.test.ts (74 tests) 6ms
✓ src/app/api/health/route.test.ts (13 tests) 48ms
✓ src/lib/public-service-config.server.test.ts (3 tests) 2ms
✓ eslint.config.test.ts (7 tests) 1170ms

Test Files 6 passed (6)
Tests 107 passed (107)
Start at 14:25:31
Duration 1.92s (transform 205ms, setup 299ms, collect 313ms, tests 1.36s, environment 1.77s, prepare 432ms)

## Lint

`bun run lint` completed successfully with no warnings.

## Typecheck

`bun run typecheck` completed successfully.

## Build

▲ Next.js 16.1.6 (Turbopack)

- Experiments (use with caution):
  · clientTraceMetadata

  Creating an optimized production build ...
  ✓ Compiled successfully in 4.3s
  Running next.config.js provided runAfterProductionCompile ...
  ✓ Completed runAfterProductionCompile in 155ms
  Running TypeScript ...
  Collecting page data using 10 workers ...
  Generating static pages using 10 workers (0/31) ...
  Generating static pages using 10 workers (7/31)
  Generating static pages using 10 workers (15/31)
  Generating static pages using 10 workers (23/31)
  ✓ Generating static pages using 10 workers (31/31) in 335.2ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /\_not-found
├ ƒ /analytics
├ ƒ /api/coach
├ ƒ /api/health
├ ƒ /api/stripe/checkout
├ ƒ /api/stripe/portal
├ ƒ /api/test-error
├ ƒ /api/test/reset
├ ƒ /apple-icon
├ ƒ /coach
├ ƒ /history
├ ƒ /history/exercise/[exerciseId]
├ ƒ /icon
├ ƒ /ingest/[[...path]]
├ ƒ /opengraph-image
├ ○ /pricing
├ ƒ /privacy
├ ○ /releases
├ ● /releases/[version]
│ ├ /releases/1.7.0
│ ├ /releases/1.6.2
│ ├ /releases/1.6.1
│ └ [+9 more paths]
├ ○ /robots.txt
├ ƒ /settings
├ ƒ /sign-in/[[...sign-in]]
├ ƒ /sign-up/[[...sign-up]]
├ ○ /sitemap.xml
├ ƒ /terms
├ ƒ /test-analytics
├ ƒ /test-error
├ ƒ /today
└ ○ /twitter-image

ƒ Proxy (Middleware)

○ (Static) prerendered as static content
● (SSG) prerendered as static HTML (uses generateStaticParams)
ƒ (Dynamic) server-rendered on demand
