# Testing

## E2E Testing (Playwright)

We use Playwright for end-to-end testing. Tests are located in `e2e/`.

### Setup

1. **Environment Variables**: Ensure your `.env.local` (or `.env.test.local`) has the following:

   ```bash
   # Clerk (from your Clerk Dashboard > API Keys)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # Test User (for global auth setup)
   CLERK_TEST_USER_EMAIL=test+e2e@example.com
   CLERK_TEST_USER_PASSWORD=secure_password_here

   # Test Data Reset (Optional, for deterministic cleanup)
   # Must match the value set in your Convex Dashboard Environment Variables
   TEST_RESET_SECRET=some_long_random_string
   ```

2. **Convex Config**: Ensure `TEST_RESET_SECRET` is also set in your Convex deployment variables if you want to use the data reset feature.

### Running Tests

- **Interactive Mode** (opens UI):

  ```bash
  pnpm test:ui
  ```

- **Headless Mode** (CI style):

  ```bash
  pnpm test:e2e
  ```

- **Specific Test File**:
  ```bash
  pnpm test:e2e e2e/critical-flow.spec.ts
  ```

### Authentication

We use a global setup (`e2e/global-setup.ts`) to sign in once and reuse the session.
The session state is stored in `e2e/.auth/user.json` (gitignored).
If `CLERK_TEST_USER_EMAIL` is missing, tests requiring auth will fail or be skipped.

### Data Reset

To ensure clean state, tests can call `resetUserData()` from the test fixture.
This triggers a guarded API endpoint that wipes the test user's data in Convex.
**WARNING**: Only use with a dedicated test user!
