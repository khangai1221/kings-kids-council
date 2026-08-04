import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionMatrix } from "@/app/admin/roles/permission-matrix";
import type { Role } from "@/lib/permissions/roles";

export const metadata = { title: "Roles & Permissions" };

export default async function AdminRolesPage() {
  await requireCapability("roles.manage");
  const supabase = createSupabaseServerClient();

  const [{ data: permissions }, { data: rolePermissions }] = await Promise.all([
    supabase.from("permissions").select("key, label, category").order("category"),
    supabase.from("role_permissions").select("role_key, permission_key"),
  ]);

  const grants: Record<Role, string[]> = {
    student: [], council_member: [], reviewer: [],
    admin: [], teacher_advisor: [], super_admin: [],
  };
  for (const row of rolePermissions ?? []) {
    grants[row.role_key as Role].push(row.permission_key);
  }

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Grant additional capabilities to a role. Super Admin always has every capability and cannot be edited here."
      />
      <PermissionMatrix permissions={permissions ?? []} grants={grants} />
    </div>
  );
}
