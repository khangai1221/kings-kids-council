import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/permissions/roles";
import { can } from "@/lib/permissions/capabilities";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { UserFilters } from "@/app/admin/users/user-filters";
import { UserRoleSelect } from "@/app/admin/users/user-role-select";
import { UserStatusToggle } from "@/app/admin/users/user-status-toggle";
import { Users } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/permissions/roles";
import type { AccountStatus } from "@/lib/constants";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const user = await requireCapability("users.manage");
  const { q, role, status } = await searchParams;
  const supabase = createSupabaseServerClient();

  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`display_name.ilike.%${q}%,school_email.ilike.%${q}%`);
  if (role) query = query.eq("role", role as Role);
  if (status) query = query.eq("account_status", status as AccountStatus);

  const { data: users } = await query;
  const canEditRole = can(user.effectiveRoles, user.capabilities, "roles.manage");
  const canAssignSuperAdmin = isSuperAdmin(user.effectiveRoles);

  return (
    <div>
      <PageHeader title="Users" description="Search and manage the student directory." />
      <UserFilters search={q} role={role} status={status} />

      {!users || users.length === 0 ? (
        <EmptyState icon={Users} title="No matching users." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {users.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell data-label="Name" className="font-medium">{profile.display_name}</TableCell>
                  <TableCell data-label="Email">{profile.school_email}</TableCell>
                  <TableCell data-label="Role">
                    {canEditRole ? (
                      <UserRoleSelect userId={profile.id} role={profile.role} canAssignSuperAdmin={canAssignSuperAdmin} />
                    ) : (
                      <Badge variant="outline">{ROLE_LABELS[profile.role]}</Badge>
                    )}
                  </TableCell>
                  <TableCell data-label="Status"><StatusBadge status={profile.account_status} /></TableCell>
                  <TableCell data-label=""><UserStatusToggle userId={profile.id} status={profile.account_status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
