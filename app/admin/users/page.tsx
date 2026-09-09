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
import { StaffRequestActions } from "@/app/admin/users/staff-request-actions";
import { Users } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/permissions/roles";
import type { AccountStatus } from "@/lib/constants";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; request?: string }>;
}) {
  const user = await requireCapability("users.manage");
  const { q, role, status, request } = await searchParams;
  const supabase = createSupabaseServerClient();
  const staffRequestsOnly = request === "staff";

  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`display_name.ilike.%${q}%,school_email.ilike.%${q}%`);
  if (role) query = query.eq("role", role as Role);
  if (status) query = query.eq("account_status", status as AccountStatus);
  if (staffRequestsOnly) query = query.not("staff_access_requested_at", "is", null).eq("role", "student");

  const [{ data: users }, { count: staffRequestCount }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("staff_access_requested_at", "is", null)
      .eq("role", "student"),
  ]);

  const canEditRole = can(user.effectiveRoles, user.capabilities, "roles.manage");
  const canAssignSuperAdmin = isSuperAdmin(user.effectiveRoles);

  return (
    <div>
      <PageHeader title="Users" description="Search and manage the student and staff directory." />
      <UserFilters
        search={q}
        role={role}
        status={status}
        staffRequests={staffRequestsOnly}
        staffRequestCount={staffRequestCount ?? 0}
      />

      {!users || users.length === 0 ? (
        <EmptyState icon={Users} title={staffRequestsOnly ? "No pending staff requests." : "No matching users."} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {users.map((profile) => {
                const pendingStaff = Boolean(profile.staff_access_requested_at) && profile.role === "student";
                return (
                  <TableRow key={profile.id}>
                    <TableCell data-label="Name" className="font-medium">
                      <span className="flex flex-wrap items-center gap-2">
                        {profile.display_name}
                        {pendingStaff ? (
                          <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                            Staff request
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell data-label="Email">{profile.school_email}</TableCell>
                    <TableCell data-label="Role">
                      {canEditRole ? (
                        <UserRoleSelect userId={profile.id} role={profile.role} canAssignSuperAdmin={canAssignSuperAdmin} />
                      ) : (
                        <Badge variant="outline">{ROLE_LABELS[profile.role]}</Badge>
                      )}
                    </TableCell>
                    <TableCell data-label="Status"><StatusBadge status={profile.account_status} /></TableCell>
                    <TableCell data-label="">
                      <span className="flex flex-wrap items-center justify-end gap-1">
                        {pendingStaff ? <StaffRequestActions userId={profile.id} /> : null}
                        <UserStatusToggle userId={profile.id} status={profile.account_status} />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
