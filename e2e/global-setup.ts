import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

export default async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const storageState = path.join(__dirname, ".auth/user.json");

  console.log("Global setup: configuring authentication...");

  // Check for required environment variables
  const email = process.env.CLERK_TEST_USER_EMAIL;
  const password = process.env.CLERK_TEST_USER_PASSWORD;

  if (!email || !password) {
    console.warn(
      "WARNING: CLERK_TEST_USER_EMAIL or CLERK_TEST_USER_PASSWORD not set."
    );
    console.warn(
      "Skipping authentication setup. Tests requiring auth may fail."
    );
    // Write empty state so Playwright doesn't crash when looking for the file
    fs.writeFileSync(
      storageState,
      JSON.stringify({ cookies: [], origins: [] })
    );
    return;
  }

  const browser = await chromium.launch({ headless: true });
  // Use a new context to ensure fresh start
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Construct sign-in URL
    const signInUrl = `${baseURL}/sign-in`;
    console.log(`Navigating to ${signInUrl} to sign in...`);

    await page.goto(signInUrl);

    // Handle Clerk Sign In
    // Wait for email input
    await page.waitForSelector('input[name="identifier"]', {
      state: "visible",
      timeout: 15000,
    });
    await page.fill('input[name="identifier"]', email);

    // Click Continue (usually the primary button)
    // Using a broad selector to catch 'Continue' or 'Sign In'
    await page.keyboard.press("Enter");

    // Wait for password input
    await page.waitForSelector('input[name="password"]', {
      state: "visible",
      timeout: 15000,
    });
    await page.fill('input[name="password"]', password);

    // Submit
    await page.keyboard.press("Enter");

    // Wait for redirect to app (away from Clerk)
    // Adjust this regex based on your post-login destination
    await page.waitForURL(
      (url) => {
        return (
          url.origin === new URL(baseURL!).origin &&
          !url.pathname.includes("sign-in")
        );
      },
      { timeout: 30000 }
    );

    // Save state
    await context.storageState({ path: storageState });
    console.log(`Auth state saved to ${storageState}`);
  } catch (error) {
    console.error("Global setup authentication failed:", error);
    // Check if we are stuck on a verification screen or something
    if (process.env.CI) {
      console.log("Dumping page content for debug...");
      // In CI, we might want to fail harder.
      throw error;
    }
  } finally {
    await browser.close();
  }
}
