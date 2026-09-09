import "server-only";
import { cache } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isEmailInAllowedDomain } from "@/lib/auth/domain";
import { env } from "@/lib/env.server";
import type { Capability } from "@/lib/permissions/capabilities";
import type { Role } from "@/lib/permissions/roles";
import type { ProfileRow } from "@/types/database";

export interface CurrentUser {
  profile: ProfileRow;
  effectiveRoles: Role[];
  capabilities: Set<Capability>;
}

/**
 * Attempts to create/repair the profile row for a brand-new Clerk sign-in
 * whose `user.created` webhook may not have landed yet (webhooks are async
 * and must never be the *only* domain check — see README "Email
 * restriction"). Verifies the primary email itself, right now, against
 * ALLOWED_EMAIL_DOMAIN before creating anything.
 */
async function syncProfileOnFirstLogin(clerkUserId: string): Promise<ProfileRow | null> {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (address) => address.id === clerkUser.primaryEmailAddressId,
  );

  if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
    return null;
  }

  const email = primaryEmail.emailAddress.toLowerCase();
  if (!isEmailInAllowedDomain(email, env.ALLOWED_EMAIL_DOMAIN)) {
    return null;
  }

  const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || email;
  // Set at sign-up by SignUpRolePicker when the person chose "Teacher / staff".
  // Records the request only; the role stays `student` until an admin acts.
  const staffRequested = clerkUser.unsafeMetadata?.staffAccessRequested === true;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .upsert(
      {
        clerk_user_id: clerkUserId,
        school_email: email,
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
        display_name: displayName,
        avatar_url: clerkUser.imageUrl,
        account_status: "active",
        ...(staffRequested ? { staff_access_requested_at: new Date().toISOString() } : {}),
      },
      { onConflict: "clerk_user_id" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("Failed to sync profile on first login", error);
    return null;
  }

  return data;
}

/**
 * Resolves the signed-in user's profile + effective roles + capabilities.
 * Returns null for: no Clerk session, no resolvable profile, a non-school
 * email (defense in depth even though sync should never let this happen),
 * or a non-active account. Cached per-request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createSupabaseServerClient();
  let { data: profile } = await supabase.from("profiles").select("*").eq("clerk_user_id", userId).maybeSingle();

  if (!profile) {
    profile = await syncProfileOnFirstLogin(userId);
  }

  if (!profile) return null;
  if (profile.account_status !== "active") return null;
  if (!isEmailInAllowedDomain(profile.school_email, env.ALLOWED_EMAIL_DOMAIN)) return null;

  const [{ data: effectiveRoles }, { data: capabilities }] = await Promise.all([
    supabase.rpc("current_effective_roles"),
    supabase.rpc("list_current_capabilities"),
  ]);

  // Fire-and-forget activity timestamp; never block the request on it.
  void supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", profile.id);

  return {
    profile,
    effectiveRoles: (effectiveRoles ?? [profile.role]) as Role[],
    capabilities: new Set((capabilities ?? []) as Capability[]),
  };
});
