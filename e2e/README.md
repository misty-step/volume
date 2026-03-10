# Testing

## E2E Testing (Playwright)

We use Playwright for end-to-end testing. Tests are located in `e2e/`.

### Setup

1. **Environment Variables**: Ensure your `.env.local` (or `.env.test.local`) has the following:

   ```bash
   # Clerk (from your Clerk Dashboard > API Keys)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_JWT_ISSUER_DOMAIN=your-tenant.clerk.accounts.dev

   # Test User (for global auth setup)
   CLERK_TEST_USER_EMAIL=test+e2e@example.com
   CLERK_TEST_USER_PASSWORD=secure_password_here

   # Convex
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

   # Coach runtime
   OPENROUTER_API_KEY=sk-or-...

   # Test Data Reset (Optional, for deterministic cleanup)
   # Must match the value set in your Convex Dashboard Environment Variables
   TEST_RESET_SECRET=some_long_random_string
   ```

2. **Convex Config**: Ensure `TEST_RESET_SECRET` is also set in your Convex deployment variables if you want to use the data reset feature.

3. **GitHub Actions**: The CI workflow fails immediately if any required E2E secret is missing. Configure these repo secrets with the same names used locally:
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_TEST_USER_EMAIL`, `CLERK_TEST_USER_PASSWORD`, `NEXT_PUBLIC_CONVEX_URL`, `OPENROUTER_API_KEY`, `TEST_RESET_SECRET`.

### Running Tests

- **Interactive Mode** (opens UI):

  ```bash
  bun run test:ui
  ```

- **Headless Mode** (CI style):

  ```bash
  bun run test:e2e
  ```

  By default the suite runs with a single Playwright worker because all coach
  flows share one authenticated test account and can trip the per-user coach
  rate limit when run in parallel. Override with `PLAYWRIGHT_WORKERS=<n>` only
  when you know the target flows are isolated.

- **Specific Test File**:
  ```bash
  bun run test:e2e e2e/critical-flow.spec.ts
  ```

### Authentication

We use a global setup (`e2e/global-setup.ts`) to sign in once and reuse the session.
The session state is stored in `e2e/.auth/user.json` (gitignored).
If `CLERK_TEST_USER_EMAIL` is missing, tests requiring auth will fail or be skipped.

### Data Reset

To ensure clean state, tests can call `resetUserData()` from the test fixture.
This triggers a guarded API endpoint that wipes the test user's data in Convex.
**WARNING**: Only use with a dedicated test user!
