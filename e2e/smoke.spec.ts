import { publicTest as test, expect } from "./auth-fixture";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Volume/i);
  await expect(page.getByRole("heading", { name: /volume\./i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /start for free/i })
  ).toBeVisible();
});

test("footer privacy link navigates to the privacy page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy(?:\?.*)?$/);
});
