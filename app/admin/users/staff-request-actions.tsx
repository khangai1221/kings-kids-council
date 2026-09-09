"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { dismissStaffAccessRequest } from "@/actions/users";

/**
 * Shown on a user row that has a pending "Teacher / staff" sign-up request.
 * To *grant* access the admin uses the role dropdown as normal (which clears
 * the request); this button is the "no, keep them a student" path.
 */
export function StaffRequestActions({ userId }: { userId: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={<Button size="sm" variant="ghost">Dismiss request</Button>}
      title="Dismiss this staff access request?"
      description="The account stays a regular student. They can be given a staff role later from the role dropdown."
      confirmLabel="Dismiss"
      onConfirm={async () => {
        const result = await dismissStaffAccessRequest(userId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Request dismissed.");
        router.refresh();
      }}
    />
  );
}
