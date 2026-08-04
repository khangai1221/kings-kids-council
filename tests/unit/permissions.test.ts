import { describe, expect, it } from "vitest";
import { can, canAny, defaultCapabilitiesForRoles } from "@/lib/permissions/capabilities";
import { isAdminTier, isSuperAdmin, highestRole, isValidRole, ROLE_RANK } from "@/lib/permissions/roles";

describe("lib/permissions/roles", () => {
  it("ranks roles in the expected hierarchy", () => {
    expect(ROLE_RANK.student).toBeLessThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeLessThan(ROLE_RANK.teacher_advisor);
    expect(ROLE_RANK.teacher_advisor).toBeLessThan(ROLE_RANK.super_admin);
  });

  it("treats admin, teacher_advisor and super_admin as admin-tier", () => {
    expect(isAdminTier(["admin"])).toBe(true);
    expect(isAdminTier(["teacher_advisor"])).toBe(true);
    expect(isAdminTier(["super_admin"])).toBe(true);
    expect(isAdminTier(["student"])).toBe(false);
    expect(isAdminTier(["council_member", "reviewer"])).toBe(false);
  });

  it("identifies super admins", () => {
    expect(isSuperAdmin(["super_admin"])).toBe(true);
    expect(isSuperAdmin(["admin"])).toBe(false);
  });

  it("finds the highest-ranked role in a list", () => {
    expect(highestRole(["student", "reviewer", "admin"])).toBe("admin");
    expect(highestRole([])).toBe("student");
  });

  it("validates role strings", () => {
    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("wizard")).toBe(false);
  });
});

describe("lib/permissions/capabilities", () => {
  it("grants super_admin every capability regardless of the granted set", () => {
    expect(can(["super_admin"], [], "settings.manage")).toBe(true);
  });

  it("denies a capability that was not granted", () => {
    expect(can(["student"], [], "applications.manage")).toBe(false);
  });

  it("allows a capability that was explicitly granted to the role", () => {
    expect(can(["council_member"], ["announcements.manage"], "announcements.manage")).toBe(true);
  });

  it("canAny returns true if at least one capability matches", () => {
    expect(canAny(["reviewer"], ["reviews.manage"], ["applications.manage", "reviews.manage"])).toBe(true);
    expect(canAny(["student"], [], ["applications.manage", "reviews.manage"])).toBe(false);
  });

  it("expands default capabilities for admin and teacher_advisor", () => {
    const adminCaps = defaultCapabilitiesForRoles(["admin"]);
    expect(adminCaps.has("applications.manage")).toBe(true);
    expect(adminCaps.has("settings.manage")).toBe(false);

    const advisorCaps = defaultCapabilitiesForRoles(["teacher_advisor"]);
    expect(advisorCaps.has("suggestions.manage_restricted")).toBe(true);
    expect(advisorCaps.has("elections.publish")).toBe(true);
  });

  it("expands every capability for super_admin via defaultCapabilitiesForRoles", () => {
    const caps = defaultCapabilitiesForRoles(["super_admin"]);
    expect(caps.has("settings.manage")).toBe(true);
    expect(caps.has("roles.manage")).toBe(true);
  });

  it("students and council_members have no default capabilities", () => {
    expect(defaultCapabilitiesForRoles(["student"]).size).toBe(0);
    expect(defaultCapabilitiesForRoles(["council_member"]).size).toBe(0);
  });
});
