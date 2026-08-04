"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { updateRolePermission } from "@/actions/users";
import type { Role } from "@/lib/permissions/roles";

const EDITABLE_ROLES: Role[] = ["council_member", "reviewer", "admin", "teacher_advisor"];

interface PermissionMatrixProps {
  permissions: { key: string; label: string; category: string }[];
  grants: Record<Role, string[]>;
}

export function PermissionMatrix({ permissions, grants }: PermissionMatrixProps) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="p-3 text-left font-medium">Permission</th>
            {EDITABLE_ROLES.map((role) => (
              <th key={role} className="p-3 text-center font-medium capitalize">{role.replace("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.key} className="border-b border-border last:border-0">
              <td className="p-3">
                <p className="font-medium text-foreground">{permission.label}</p>
                <p className="text-xs text-muted-foreground">{permission.key}</p>
              </td>
              {EDITABLE_ROLES.map((role) => (
                <td key={role} className="p-3 text-center">
                  <Checkbox
                    checked={grants[role]?.includes(permission.key) ?? false}
                    onCheckedChange={async (checked) => {
                      const result = await updateRolePermission(role, permission.key, Boolean(checked));
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      router.refresh();
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
