import path from "node:path";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import { test as setup } from "@playwright/test";

/**
 * Provisions three Clerk test users (student / reviewer / admin) using the
 * "+clerk_test" email convention, so Clerk auto-verifies them without
 * sending real emails, then completes onboarding directly via Supabase
 * (bypassing the UI, since this is test fixture setup, not a feature under
 * test — the onboarding UI flow itself is covered separately in
 * tests/e2e/unauthenticated/onboarding.spec.ts using a throwaway account).
 * Requires:
 *   E2E_CLERK_STUDENT_EMAIL / E2E_CLERK_STUDENT_PASSWORD
 *   E2E_CLERK_REVIEWER_EMAIL / E2E_CLERK_REVIEWER_PASSWORD
 *   E2E_CLERK_ADMIN_EMAIL / E2E_CLERK_ADMIN_PASSWORD
 * Emails must end in the ALLOWED_EMAIL_DOMAIN school domain and contain
 * "+clerk_test" so Clerk treats them as test-mode addresses, e.g.
 *   e2e-student+clerk_test@kingskids.mn
 */
setup.describe.configure({ mode: "serial" });

interface Persona {
  role: "student" | "reviewer" | "admin";
  emailEnv: string;
  passwordEnv: string;
}

const PERSONAS: Persona[] = [
  { role: "student", emailEnv: "E2E_CLERK_STUDENT_EMAIL", passwordEnv: "E2E_CLERK_STUDENT_PASSWORD" },
  { role: "reviewer", emailEnv: "E2E_CLERK_REVIEWER_EMAIL", passwordEnv: "E2E_CLERK_REVIEWER_PASSWORD" },
  { role: "admin", emailEnv: "E2E_CLERK_ADMIN_EMAIL", passwordEnv: "E2E_CLERK_ADMIN_PASSWORD" },
];

setup("global setup", async () => {
  await clerkSetup({ dotenv: false });
});

for (const persona of PERSONAS) {
  setup(`authenticate as ${persona.role}`, async ({ page }) => {
    const email = process.env[persona.emailEnv];
    const password = process.env[persona.passwordEnv];
    if (!email || !password) {
      setup.skip(true, `Set ${persona.emailEnv} and ${persona.passwordEnv} to run ${persona.role} e2e tests.`);
      return;
    }

    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    const { data: existing } = await clerkClient.users.getUserList({ emailAddress: [email] });
    if (existing.length === 0) {
      await clerkClient.users.createUser({ emailAddress: [email], password, firstName: "E2E", lastName: persona.role });
    }

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: email });

    // Let the first-login sync create the profile row (see
    // lib/auth/current-user.ts), then finish setup directly via Supabase so
    // every role-based spec starts from a clean, fully onboarded state.
    await page.goto("/dashboard");
    await page.waitForURL(/\/(dashboard|onboarding)/);

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: gradeLevel } = await supabaseAdmin.from("grade_levels").select("id").order("sort_order").limit(1).maybeSingle();

    await supabaseAdmin
      .from("profiles")
      .update({
        role: persona.role,
        onboarding_status: "completed",
        display_name: `E2E ${persona.role}`,
        grade_level_id: gradeLevel?.id ?? null,
        accepted_rules_at: new Date().toISOString(),
        accepted_privacy_at: new Date().toISOString(),
      })
      .eq("school_email", email.toLowerCase());

    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/);
    await page.context().storageState({ path: path.join(__dirname, `../../playwright/.clerk/${persona.role}.json`) });
  });
}
