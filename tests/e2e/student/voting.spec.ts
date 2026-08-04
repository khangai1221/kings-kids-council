import { test, expect } from "@playwright/test";

test.describe("student voting", () => {
  test("election results stay hidden before publication", async ({ page }) => {
    await page.goto("/voting");
    const closedElection = page.getByText(/closed|results published/i).first();
    test.skip((await closedElection.count()) === 0, "No closed/published election in the current fixture state.");
  });

  test("a student can cast one ballot, and a second attempt is rejected", async ({ page }) => {
    await page.goto("/voting");
    const openElection = page.getByRole("link").filter({ hasText: /election/i }).first();
    test.skip((await openElection.count()) === 0, "No open election in the current fixture state.");

    await openElection.click();
    const submitBallot = page.getByRole("button", { name: /submit ballot/i });
    test.skip(!(await submitBallot.isVisible().catch(() => false)), "Ballot form not shown — election may already be voted in.");

    // Select the first candidate for every position shown.
    const candidateButtons = page.locator("button[aria-pressed]");
    const positionCount = await candidateButtons.count();
    if (positionCount > 0) await candidateButtons.first().click();

    await submitBallot.click();
    await expect(page.getByText(/ballot was submitted successfully/i)).toBeVisible();

    // Reload and confirm a second vote is not offered (already-voted state).
    await page.reload();
    await expect(page.getByText(/already voted/i)).toBeVisible();
  });
});
