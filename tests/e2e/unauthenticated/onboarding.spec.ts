import { test, expect } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";

/**
 * Exercises the real onboarding UI end to end using a fresh, throwaway
 * account (never pre-completed via Supabase, unlike the shared personas in
 * global.setup.ts). Requires E2E_CLERK_ONBOARDING_EMAIL / _PASSWORD.
 */
test("student completes onboarding after first sign-in", async ({ page }) => {
  const email = process.env.E2E_CLERK_ONBOARDING_EMAIL;
  const password = process.env.E2E_CLERK_ONBOARDING_PASSWORD;
  test.skip(!email || !password, "Set E2E_CLERK_ONBOARDING_EMAIL and E2E_CLERK_ONBOARDING_PASSWORD to run this test.");

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const { data: existing } = await clerkClient.users.getUserList({ emailAddress: [email!] });
  for (const user of existing) await clerkClient.users.deleteUser(user.id);
  await clerkClient.users.createUser({ emailAddress: [email!], password: password!, firstName: "Onboarding", lastName: "Test" });

  await setupClerkTestingToken({ page });
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email! });

  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();

  await page.getByLabel("Display name").fill("Onboarding Test Student");
  await page.getByLabel("Grade").click();
  await page.getByRole("option").first().click();
  await page.getByLabel(/accept the/i).first().check();
  await page.getByLabel(/privacy notice/i).check();
  await page.getByRole("button", { name: /continue to dashboard/i }).click();

  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText(/welcome back/i)).toBeVisible();
});
