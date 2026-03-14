import {
  defineConfig,
  devices,
  type ReporterDescription,
} from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { loadE2EEnv } from "./e2e/env";

// Load environment variables from .env.local or .env
if (fs.existsSync(path.resolve(__dirname, ".env.local"))) {
  dotenv.config({ path: path.resolve(__dirname, ".env.local") });
}
dotenv.config({ path: path.resolve(__dirname, ".env") });

const authFile = "e2e/.auth/user.json";
const e2eEnv = loadE2EEnv();
const playwrightWorkers = Number.parseInt(
  process.env.PLAYWRIGHT_WORKERS || "1",
  10
);
const ciReporter: ReporterDescription[] = [
  ["line"],
  ["html", { open: "never" }],
];
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  maxFailures: process.env.CI ? 3 : 0,
  workers:
    Number.isFinite(playwrightWorkers) && playwrightWorkers > 0
      ? playwrightWorkers
      : 1,
  reporter: process.env.CI ? ciReporter : "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      retries: 2,
    },
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
    command: "bun run dev:next",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120000,
    env: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        e2eEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: e2eEnv.CLERK_SECRET_KEY,
      CLERK_JWT_ISSUER_DOMAIN: e2eEnv.CLERK_JWT_ISSUER_DOMAIN,
      NEXT_PUBLIC_CONVEX_URL: e2eEnv.NEXT_PUBLIC_CONVEX_URL,
      TEST_RESET_SECRET: e2eEnv.TEST_RESET_SECRET,
      OPENROUTER_API_KEY: e2eEnv.OPENROUTER_API_KEY,
      NEXT_PUBLIC_DISABLE_SENTRY: "true",
      NEXT_PUBLIC_DISABLE_ANALYTICS: "true",
    },
  },
});
