import { publicTest as test, expect } from "./auth-fixture";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Volume/i);
  await expect(page.getByText("SIMPLE LOGGING.")).toBeVisible();
  await expect(page.getByRole("button", { name: "GET STARTED" })).toBeVisible();
});

test("navigation to sign up", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "GET STARTED" }).click();
  // Should redirect to sign-up (Clerk or local route)
  await expect(page).toHaveURL(/.*sign-up/);
});
