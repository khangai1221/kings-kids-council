"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { withdrawApplication } from "@/actions/applications";

export function WithdrawButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={<Button variant="outline">Withdraw application</Button>}
      title="Withdraw this application?"
      description="You will no longer be considered for this position. This cannot be undone."
      confirmLabel="Withdraw"
      destructive
      onConfirm={async () => {
        const result = await withdrawApplication(submissionId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Application withdrawn.");
        router.refresh();
      }}
    />
  );
}
