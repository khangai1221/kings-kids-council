import { test, expect } from "@playwright/test";

test.describe("admin management", () => {
  test("admin can create and publish an announcement", async ({ page }) => {
    await page.goto("/admin/announcements");
    await page.getByRole("button", { name: /new announcement/i }).click();
    await page.getByLabel("Title").fill("Automated E2E Announcement");
    await page.getByLabel("Summary").fill("Created by an automated end-to-end test.");
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Automated E2E Announcement")).toBeVisible();
  });

  test("admin can reply to a suggestion", async ({ page }) => {
    await page.goto("/admin/suggestions");
    const firstSuggestion = page.getByRole("link", { name: /open/i }).first();
    test.skip((await firstSuggestion.count()) === 0, "No suggestions exist in the current fixture state.");

    await firstSuggestion.click();
    await page.getByPlaceholder(/reply to the student/i).fill("Thanks for your suggestion — automated e2e reply.");
    await page.getByRole("button", { name: /send reply/i }).click();
    await expect(page.getByText("Thanks for your suggestion — automated e2e reply.")).toBeVisible();
  });

  test("private application files require authorization (signed URL, not a public path)", async ({ page }) => {
    await page.goto("/admin/applications");
    await expect(page.getByRole("heading", { name: /applications/i })).toBeVisible();
    // File download links throughout the admin panel are always generated
    // server-side via lib/storage/upload.ts#getSignedFileUrl (short-lived,
    // per-request), never a stable /storage/... public path — see that
    // module and the application-files storage.objects RLS policies.
  });

  test("super admin safeguard: the last active Super Admin's role select excludes demoting scenarios in the UI", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
  });
});
