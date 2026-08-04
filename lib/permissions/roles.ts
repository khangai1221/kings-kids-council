/**
 * Role model. Kept dependency-free (no Next.js / Supabase imports) so it can
 * be unit tested in isolation and shared between server and client code.
 */

export const ROLES = [
  "student",
  "council_member",
  "reviewer",
  "admin",
  "teacher_advisor",
  "super_admin",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  council_member: "Council Member",
  reviewer: "Reviewer",
  admin: "Admin",
  teacher_advisor: "Teacher Advisor",
  super_admin: "Super Admin",
};

/** Roles that may access the /admin area at all (fine-grained gating happens via capabilities). */
export const ADMIN_TIER_ROLES: readonly Role[] = ["admin", "teacher_advisor", "super_admin"];

/** Coarse rank used only for simple "is at least as senior as" comparisons in UI. */
export const ROLE_RANK: Record<Role, number> = {
  student: 0,
  council_member: 1,
  reviewer: 1,
  admin: 2,
  teacher_advisor: 3,
  super_admin: 4,
};

export function isAdminTier(roles: readonly Role[]): boolean {
  return roles.some((role) => ADMIN_TIER_ROLES.includes(role));
}

export function isSuperAdmin(roles: readonly Role[]): boolean {
  return roles.includes("super_admin");
}

export function highestRole(roles: readonly Role[]): Role {
  return roles.reduce<Role>(
    (top, role) => (ROLE_RANK[role] > ROLE_RANK[top] ? role : top),
    "student",
  );
}

export function isValidRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
