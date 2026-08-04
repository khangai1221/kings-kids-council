"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { updateUserAccountStatus } from "@/actions/users";
import type { AccountStatus } from "@/lib/constants";

export function UserStatusToggle({ userId, status }: { userId: string; status: AccountStatus }) {
  const router = useRouter();
  const nextStatus: AccountStatus = status === "active" ? "inactive" : "active";

  return (
    <ConfirmDialog
      trigger={<Button size="sm" variant="outline">{status === "active" ? "Deactivate" : "Activate"}</Button>}
      title={status === "active" ? "Deactivate this account?" : "Activate this account?"}
      description={
        status === "active"
          ? "The student will lose portal access immediately. Historical records are preserved."
          : "The student will regain portal access."
      }
      destructive={status === "active"}
      confirmLabel={status === "active" ? "Deactivate" : "Activate"}
      onConfirm={async () => {
        const result = await updateUserAccountStatus(userId, nextStatus);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Account status updated.");
        router.refresh();
      }}
    />
  );
}
