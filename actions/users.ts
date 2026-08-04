"use server";

import { revalidatePath } from "next/cache";
import { assertCapability, AuthorizationError } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AccountStatus } from "@/lib/constants";
import { isSuperAdmin, type Role } from "@/lib/permissions/roles";

/**
 * Requires `roles.manage`, not just `users.manage` — the `role` column is
 * additionally protected by a DB trigger (enforce_profile_field_protection
 * in 20260101000016_rls_identity.sql) that rejects the update server-side
 * regardless of what capability this check requires, so the two must stay
 * in sync. Granting `super_admin` specifically is re-checked on top of
 * that, not just hidden from the dropdown (UserRoleSelect's
 * `canAssignSuperAdmin` prop), per the "hiding a button is never the only
 * protection" rule.
 */
export async function updateUserRole(userId: string, role: Role): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCapability("roles.manage");
    if (role === "super_admin" && !isSuperAdmin(user.effectiveRoles)) {
      throw new AuthorizationError("Only a Super Admin can grant the Super Admin role.");
    }
    const supabase = createSupabaseServerClient();

    const { data: before } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) throw new Error(error.message);

    await recordAuditEvent({ action: "user.role_changed", resourceType: "profile", resourceId: userId, beforeState: before, afterState: { role } });
    revalidatePath("/admin/users");
    return undefined;
  });
}

export async function updateUserAccountStatus(userId: string, status: AccountStatus): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("users.manage");
    const supabase = createSupabaseServerClient();

    const { data: before } = await supabase.from("profiles").select("account_status").eq("id", userId).maybeSingle();
    const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", userId);
    if (error) throw new Error(error.message);

    await recordAuditEvent({ action: "user.status_changed", resourceType: "profile", resourceId: userId, beforeState: before, afterState: { status } });
    revalidatePath("/admin/users");
    return undefined;
  });
}

export async function updateUserGradeClass(userId: string, gradeLevelId: string | null, schoolClassId: string | null): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("users.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("profiles").update({ grade_level_id: gradeLevelId, school_class_id: schoolClassId }).eq("id", userId);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/users");
    return undefined;
  });
}

export async function grantSupplementaryRole(userId: string, roleKey: Role): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("roles.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role_key: roleKey });
    if (error) throw new Error(error.message);
    await recordAuditEvent({ action: "user.supplementary_role_granted", resourceType: "profile", resourceId: userId, afterState: { roleKey } });
    revalidatePath("/admin/users");
    return undefined;
  });
}

export async function revokeSupplementaryRole(userId: string, roleKey: Role): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("roles.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role_key", roleKey);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/users");
    return undefined;
  });
}

export async function updateRolePermission(roleKey: Role, permissionKey: string, granted: boolean): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("roles.manage");
    const supabase = createSupabaseServerClient();
    if (granted) {
      const { error } = await supabase.from("role_permissions").insert({ role_key: roleKey, permission_key: permissionKey });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("role_permissions").delete().eq("role_key", roleKey).eq("permission_key", permissionKey);
      if (error) throw new Error(error.message);
    }
    await recordAuditEvent({ action: "role_permission.updated", resourceType: "role", resourceId: null, afterState: { roleKey, permissionKey, granted } });
    revalidatePath("/admin/roles");
    return undefined;
  });
}
