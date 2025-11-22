import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import path from "path";

// Configure setup tests to run serially
setup.describe.configure({ mode: "serial" });

// Global setup: Initialize Clerk testing environment
setup("global setup", async () => {
  console.log("Global setup: Initializing Clerk testing environment...");
  await clerkSetup();
});

const authFile = path.join(__dirname, ".auth/user.json");

// Authenticate user and save session state
setup("authenticate", async ({ page }) => {
  console.log("Authenticating test user...");

  // Check for required environment variables
  const email = process.env.CLERK_TEST_USER_EMAIL;
  const password = process.env.CLERK_TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "CLERK_TEST_USER_EMAIL and CLERK_TEST_USER_PASSWORD must be set"
    );
  }

  // Navigate to home page
  await page.goto("/");

  // Use Clerk's official sign-in helper
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: email,
      password: password,
    },
  });

  console.log("Sign-in successful, verifying authenticated state...");

  // Navigate to authenticated route and verify
  await page.goto("/today");
  await page.waitForSelector("h1", { timeout: 10000 });

  // Save authenticated state
  await page.context().storageState({ path: authFile });
  console.log(`Auth state saved to ${authFile}`);
});
