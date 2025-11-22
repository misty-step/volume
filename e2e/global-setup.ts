import { clerkSetup } from "@clerk/testing/playwright";

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

  await clerkSetup();

  console.log("Testing token ready");
}

export default globalSetup;
