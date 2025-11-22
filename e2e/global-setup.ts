import { clerkSetup } from "@clerk/testing/playwright";

const REQUIRED_ENV = [
  "CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_JWT_ISSUER_DOMAIN",
  "CLERK_TEST_USER_EMAIL",
  "CLERK_TEST_USER_PASSWORD",
  "TEST_RESET_SECRET",
];

/**
 * Global setup for Playwright E2E tests
 *
 * Generates Clerk testing token BEFORE any browser contexts launch.
 * This token bypasses Clerk's bot detection, allowing automated tests to proceed.
 *
 * Execution order (guaranteed by playwright.config.ts):
 * 1. THIS FILE - Token generation (Node.js context, no browser)
 * 2. auth.setup.ts - Authentication once, save state (Playwright test)
 * 3. *.spec.ts - Business logic tests (use saved auth state)
 *
 * Requirements:
 * - CLERK_PUBLISHABLE_KEY in environment
 * - CLERK_SECRET_KEY in environment
 *
 * @see https://clerk.com/docs/guides/development/testing/playwright/overview
 */
async function globalSetup() {
  console.log("Generating Clerk testing token...");

  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required E2E env vars: ${missing.join(", ")}. Set them in CI secrets/vars.`
    );
  }

  await clerkSetup();

  console.log("Testing token ready");
}

export default globalSetup;
