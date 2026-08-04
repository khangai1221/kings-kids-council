import { test, expect } from "@playwright/test";

test.describe("unauthenticated access control", () => {
  test("visiting a protected route redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/sign-in/);
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("the sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("body")).toBeVisible();
  });

  test("non-admin (signed-out) visitor cannot reach /admin", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/sign-in/);
  });

  test("the unauthorized page explains the school-domain restriction", async ({ page }) => {
    await page.goto("/unauthorized");
    await expect(page.getByText(/kingskids\.mn/i)).toBeVisible();
  });

  test("privacy and terms pages are publicly reachable", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /privacy/i })).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /rules/i })).toBeVisible();
  });
});
