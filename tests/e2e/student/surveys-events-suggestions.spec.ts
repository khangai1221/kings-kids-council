import { test, expect } from "@playwright/test";

test("student completes an open survey", async ({ page }) => {
  await page.goto("/surveys");
  const openSurvey = page.getByRole("link").filter({ hasText: /survey/i }).first();
  test.skip((await openSurvey.count()) === 0, "No open survey in the current fixture state.");

  await openSurvey.click();
  const submit = page.getByRole("button", { name: /submit response/i });
  test.skip(!(await submit.isVisible().catch(() => false)), "Survey already completed or not open.");

  const ratingButtons = page.locator("button[role=radio]");
  if ((await ratingButtons.count()) > 0) await ratingButtons.first().click();

  await submit.click();
  await expect(page.getByText(/thank you/i)).toBeVisible();
});

test("student registers for an event", async ({ page }) => {
  await page.goto("/events");
  const eventLink = page.getByRole("link").first();
  test.skip((await eventLink.count()) === 0, "No events in the current fixture state.");

  await eventLink.click();
  const registerButton = page.getByRole("button", { name: /^register$/i });
  test.skip(!(await registerButton.isVisible().catch(() => false)), "Registration not open for this event.");

  await registerButton.click();
  await expect(page.getByText(/registered|waitlist/i)).toBeVisible();
});

test("student submits a suggestion", async ({ page }) => {
  await page.goto("/suggestions/new");
  await page.getByLabel("Subject").fill("Automated test suggestion");
  await page.getByLabel("Message").fill("This suggestion was submitted by an automated end-to-end test.");
  await page.getByLabel(/anonymous to council/i).check();
  await page.getByRole("button", { name: /submit suggestion/i }).click();
  await page.waitForURL(/\/suggestions\//);
  await expect(page.getByText("Automated test suggestion")).toBeVisible();
});
