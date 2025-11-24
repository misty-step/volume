import { clerkSetup } from "@clerk/testing/playwright";
import { loadE2EEnv } from "./env";

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
 * Requirements: see loadE2EEnv schema in e2e/env.ts
 */
async function globalSetup() {
  console.log("Generating Clerk testing token...");

  loadE2EEnv();

  await clerkSetup();

  console.log("Testing token ready");
}

export default globalSetup;
