"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateUserRole } from "@/actions/users";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/permissions/roles";

export function UserRoleSelect({ userId, role, canAssignSuperAdmin }: { userId: string; role: Role; canAssignSuperAdmin: boolean }) {
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<Role | null>(null);

  async function apply(nextRole: Role) {
    const result = await updateUserRole(userId, nextRole);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Role updated.");
    router.refresh();
  }

  return (
    <>
      <Select
        value={role}
        onValueChange={(value) => {
          const nextRole = value as Role;
          if (nextRole === "super_admin") setPendingRole(nextRole);
          else void apply(nextRole);
        }}
      >
        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ROLES.filter((r) => r !== "super_admin" || canAssignSuperAdmin).map((r) => (
            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ConfirmDialog
        open={pendingRole !== null}
        onOpenChange={(open) => !open && setPendingRole(null)}
        title="Grant Super Admin?"
        description="Super Admins have full administrative control, including managing other administrators and site security settings."
        confirmLabel="Grant Super Admin"
        onConfirm={async () => {
          if (pendingRole) await apply(pendingRole);
          setPendingRole(null);
        }}
      />
    </>
  );
}
