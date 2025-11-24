import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables from .env.local or .env
if (fs.existsSync(path.resolve(__dirname, ".env.local"))) {
  dotenv.config({ path: path.resolve(__dirname, ".env.local") });
}
dotenv.config({ path: path.resolve(__dirname, ".env") });

const authFile = "e2e/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    // Setup project - runs authentication and saves state
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      retries: 2,
    },
    // Test project - uses authenticated state from setup
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // Always use dev server for E2E tests - it respects runtime env vars
    // Production build bakes env vars at build time, so they can't be overridden
    command: "pnpm dev:next",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120000, // Give dev server 2 minutes to start
    env: {
      // Pass through Clerk environment variables for authentication
      // These MUST be set before running E2E tests
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
      CLERK_JWT_ISSUER_DOMAIN: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL!,
      // Disable telemetry during E2E tests
      NEXT_PUBLIC_DISABLE_SENTRY: "true",
      NEXT_PUBLIC_DISABLE_ANALYTICS: "true",
    },
  },
});
