import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { can, canAny, type Capability } from "@/lib/permissions/capabilities";
import { isAdminTier, isSuperAdmin } from "@/lib/permissions/roles";
import { ROUTES } from "@/lib/constants";

/** For Server Components / layouts / pages. Redirects on failure. */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.unauthorized);
  return user;
}

export async function requireOnboardedUser(): Promise<CurrentUser> {
  const user = await requireCurrentUser();
  if (user.profile.onboarding_status !== "completed") redirect(ROUTES.onboarding);
  return user;
}

export async function requireCapability(capability: Capability): Promise<CurrentUser> {
  const user = await requireOnboardedUser();
  if (!can(user.effectiveRoles, user.capabilities, capability)) redirect(ROUTES.forbidden);
  return user;
}

export async function requireAnyCapability(capabilities: Capability[]): Promise<CurrentUser> {
  const user = await requireOnboardedUser();
  if (!canAny(user.effectiveRoles, user.capabilities, capabilities)) redirect(ROUTES.forbidden);
  return user;
}

export async function requireAdminTier(): Promise<CurrentUser> {
  const user = await requireOnboardedUser();
  if (!isAdminTier(user.effectiveRoles)) redirect(ROUTES.forbidden);
  return user;
}

/**
 * Gate for the /admin shell itself. Plain `reviewer` accounts need to reach
 * /admin/reviews for their assigned-applications workspace even though they
 * are not admin-tier; every other /admin/* page still enforces its own
 * specific capability check, so a reviewer landing on e.g. /admin/users is
 * still redirected by that page.
 */
export async function requireStaffAccess(): Promise<CurrentUser> {
  const user = await requireOnboardedUser();
  if (!isAdminTier(user.effectiveRoles) && !user.effectiveRoles.includes("reviewer")) {
    redirect(ROUTES.forbidden);
  }
  return user;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireOnboardedUser();
  if (!isSuperAdmin(user.effectiveRoles)) redirect(ROUTES.forbidden);
  return user;
}

/**
 * Thrown by the assert* helpers below (Server Action variant). Actions
 * should catch this and return `{ error: error.message }` rather than
 * letting it become an unhandled 500 — see lib/actions/result.ts.
 */
export class AuthorizationError extends Error {}

/** For Server Actions, where a hard redirect would be jarring UX. */
export async function assertCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("You must be signed in to do that.");
  return user;
}

export async function assertOnboardedUser(): Promise<CurrentUser> {
  const user = await assertCurrentUser();
  if (user.profile.onboarding_status !== "completed") {
    throw new AuthorizationError("Please finish onboarding first.");
  }
  return user;
}

export async function assertCapability(capability: Capability): Promise<CurrentUser> {
  const user = await assertOnboardedUser();
  if (!can(user.effectiveRoles, user.capabilities, capability)) {
    throw new AuthorizationError("You do not have permission to do that.");
  }
  return user;
}

export async function assertAnyCapability(capabilities: Capability[]): Promise<CurrentUser> {
  const user = await assertOnboardedUser();
  if (!canAny(user.effectiveRoles, user.capabilities, capabilities)) {
    throw new AuthorizationError("You do not have permission to do that.");
  }
  return user;
}
