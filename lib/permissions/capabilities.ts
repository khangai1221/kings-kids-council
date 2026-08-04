import type { Role } from "@/lib/permissions/roles";

/**
 * Fine-grained capabilities. These mirror the rows seeded into the
 * `permissions` table and the default `role_permissions` mapping (see
 * supabase/migrations). Admins can grant additional capabilities to a role
 * (most commonly `council_member`) at runtime from /admin/roles without a
 * code change — this array is only the set of *default* grants used to seed
 * that table and as a fallback if the table is unreachable.
 */
export const CAPABILITIES = [
  "users.manage",
  "roles.manage",
  "council.manage",
  "applications.manage",
  "forms.manage",
  "reviews.manage",
  "reviewers.manage",
  "elections.manage",
  "elections.publish",
  "surveys.manage",
  "polls.manage",
  "events.manage",
  "suggestions.manage",
  "suggestions.manage_restricted",
  "announcements.manage",
  "faq.manage",
  "notifications.manage",
  "reports.view",
  "reports.export",
  "audit.view",
  "settings.manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  "users.manage": "Manage users & directory",
  "roles.manage": "Manage roles & permissions",
  "council.manage": "Manage council terms, positions & members",
  "applications.manage": "Manage applications & campaigns",
  "forms.manage": "Manage form builder",
  "reviews.manage": "Manage & moderate reviews",
  "reviewers.manage": "Assign & manage reviewers",
  "elections.manage": "Manage elections & candidates",
  "elections.publish": "Publish elections & results",
  "surveys.manage": "Manage surveys",
  "polls.manage": "Manage polls",
  "events.manage": "Manage events & competitions",
  "suggestions.manage": "Manage suggestions inbox",
  "suggestions.manage_restricted": "Access restricted anonymous identities",
  "announcements.manage": "Manage announcements",
  "faq.manage": "Manage FAQ",
  "notifications.manage": "Send admin notifications",
  "reports.view": "View reports",
  "reports.export": "Export reports (CSV)",
  "audit.view": "View audit log",
  "settings.manage": "Manage site settings",
};

/**
 * Default role -> capability grants. `super_admin` implicitly has every
 * capability everywhere in the app (checked separately), so it is omitted
 * here to avoid duplicating the full list.
 */
export const DEFAULT_ROLE_CAPABILITIES: Record<Exclude<Role, "super_admin">, Capability[]> = {
  student: [],
  council_member: [],
  reviewer: [],
  admin: [
    "users.manage",
    "council.manage",
    "applications.manage",
    "forms.manage",
    "reviews.manage",
    "reviewers.manage",
    "elections.manage",
    "surveys.manage",
    "polls.manage",
    "events.manage",
    "suggestions.manage",
    "announcements.manage",
    "faq.manage",
    "notifications.manage",
    "reports.view",
    "reports.export",
  ],
  teacher_advisor: [
    "reviews.manage",
    "reviewers.manage",
    "elections.publish",
    "suggestions.manage",
    "suggestions.manage_restricted",
    "reports.view",
    "audit.view",
  ],
};

/**
 * Pure capability check. `effectiveRoles` should already include the user's
 * primary role plus any supplementary roles from `user_roles`.
 * `grantedCapabilities` is the resolved set from `role_permissions` for those
 * roles (already expanded server-side); this function does not fetch or
 * cache anything so it stays trivially unit-testable.
 */
export function can(
  effectiveRoles: readonly Role[],
  grantedCapabilities: ReadonlySet<Capability> | Capability[],
  capability: Capability,
): boolean {
  if (effectiveRoles.includes("super_admin")) return true;
  const granted =
    grantedCapabilities instanceof Set ? grantedCapabilities : new Set(grantedCapabilities);
  return granted.has(capability);
}

export function canAny(
  effectiveRoles: readonly Role[],
  grantedCapabilities: ReadonlySet<Capability> | Capability[],
  capabilities: readonly Capability[],
): boolean {
  return capabilities.some((capability) => can(effectiveRoles, grantedCapabilities, capability));
}

/** Expands default capabilities for a set of roles (used as a fallback / for seeding). */
export function defaultCapabilitiesForRoles(roles: readonly Role[]): Set<Capability> {
  const set = new Set<Capability>();
  for (const role of roles) {
    if (role === "super_admin") {
      for (const capability of CAPABILITIES) set.add(capability);
      continue;
    }
    for (const capability of DEFAULT_ROLE_CAPABILITIES[role]) set.add(capability);
  }
  return set;
}
