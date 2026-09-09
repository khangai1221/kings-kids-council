import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isEmailInAllowedDomain } from "@/lib/auth/domain";
import { env } from "@/lib/env.server";

interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification?: { status?: string | null } | null;
}

export interface ClerkUserWebhookPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  unsafe_metadata?: Record<string, unknown> | null;
}

function getPrimaryVerifiedEmail(user: ClerkUserWebhookPayload): string | null {
  const primary = user.email_addresses.find((address) => address.id === user.primary_email_address_id);
  if (!primary || primary.verification?.status !== "verified") return null;
  return primary.email_address.toLowerCase();
}

/**
 * Handles `user.created` and `user.updated`. Domain/verification is checked
 * again here even though the Clerk signup allowlist and the onboarding guard
 * also check it — this webhook is what catches a user changing their primary
 * email to something outside the school domain *after* they already had an
 * account.
 */
export async function syncClerkUserCreatedOrUpdated(user: ClerkUserWebhookPayload) {
  const admin = createSupabaseAdminClient();
  const email = getPrimaryVerifiedEmail(user);
  const isAllowed = Boolean(email) && isEmailInAllowedDomain(email!, env.ALLOWED_EMAIL_DOMAIN);

  const { data: existing } = await admin
    .from("profiles")
    .select("id, account_status")
    .eq("clerk_user_id", user.id)
    .maybeSingle();

  if (!isAllowed) {
    // Never activate (or leave active) a profile whose current verified
    // email is outside the allowed domain. Admin-driven `inactive` status is
    // left alone; only the auto-managed `suspended` state is used here so we
    // never silently undo a deliberate admin deactivation.
    if (existing) {
      await admin.from("profiles").update({ account_status: "suspended" }).eq("clerk_user_id", user.id);
    }
    return;
  }

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || email!;

  const nextStatus = !existing ? "active" : existing.account_status === "suspended" ? "active" : existing.account_status;

  // Only stamp the staff-access request on the first sync for this account
  // (the person picked "Teacher / staff" at sign-up). Never on `user.updated`.
  const staffRequested = !existing && user.unsafe_metadata?.staffAccessRequested === true;

  await admin.from("profiles").upsert(
    {
      clerk_user_id: user.id,
      school_email: email!,
      first_name: user.first_name,
      last_name: user.last_name,
      display_name: displayName,
      avatar_url: user.image_url,
      account_status: nextStatus,
      ...(staffRequested ? { staff_access_requested_at: new Date().toISOString() } : {}),
    },
    { onConflict: "clerk_user_id" },
  );
}

/** Handles `user.deleted`. Deactivates rather than deletes — historical council records must survive. */
export async function syncClerkUserDeleted(user: { id: string }) {
  const admin = createSupabaseAdminClient();
  await admin
    .from("profiles")
    .update({ account_status: "inactive", deactivated_at: new Date().toISOString() })
    .eq("clerk_user_id", user.id);
}
