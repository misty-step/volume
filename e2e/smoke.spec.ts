import { publicTest as test, expect } from "./auth-fixture";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Volume/i);
  await expect(page.getByRole("heading", { name: /Volume\./i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Start for free/i })
  ).toBeVisible();
});

test("navigation to sign up", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start for free/i }).click();
  // Should redirect to sign-up (Clerk or local route)
  await expect(page).toHaveURL(/.*sign-up/);
});
