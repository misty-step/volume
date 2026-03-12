import { publicTest as test, expect } from "./auth-fixture";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Volume/i);
  await expect(page.getByRole("heading", { name: /Volume\.?/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Start for free/i })
  ).toBeVisible();
});

test("start for free opens the sign-up modal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start for free/i }).click();
  await expect(
    page.getByRole("heading", { name: /Create your account/i })
  ).toBeVisible();
});
