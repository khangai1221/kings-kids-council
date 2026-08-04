import { test, expect } from "@playwright/test";

test.describe("student application flow", () => {
  test("student cannot access /admin", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/unauthorized/);
  });

  test("student starts and submits an application", async ({ page }) => {
    await page.goto("/applications");
    const campaignLink = page.getByRole("link").filter({ hasText: /council election/i }).first();
    test.skip((await campaignLink.count()) === 0, "No open application campaign in the current fixture state.");

    await campaignLink.click();
    await page.getByRole("button", { name: "Apply" }).first().click();
    await page.waitForURL(/\/applications\/submissions\//);

    const textFields = page.locator("textarea, input[type=text]");
    const count = await textFields.count();
    for (let i = 0; i < count; i += 1) {
      await textFields.nth(i).fill("Automated end-to-end test answer.");
    }

    const submit = page.getByRole("button", { name: /submit application/i });
    if (await submit.isVisible()) {
      await submit.click();
      await expect(page.getByText(/submitted/i)).toBeVisible();
    }
  });

  test("a submission belonging to someone else (or a nonexistent id) is not accessible", async ({ page }) => {
    await page.goto("/applications/submissions/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
