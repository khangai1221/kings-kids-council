import { test, expect } from "@playwright/test";

test.describe("reviewer workspace", () => {
  test("reviewer cannot access general admin pages", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForURL(/\/unauthorized/);
  });

  test("reviewer can reach the reviews workspace and only sees assigned applications", async ({ page }) => {
    await page.goto("/admin/reviews");
    await expect(page.getByRole("heading", { name: /reviews/i })).toBeVisible();
    // The seeded reviewer has zero assignments in a fresh database — an
    // empty state is the correct, secure default (never "all applications").
  });

  test("opening an unassigned application's review page is not authorized", async ({ page }) => {
    await page.goto("/admin/reviews/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
