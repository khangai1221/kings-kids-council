"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateApplicationStatus } from "@/actions/applications";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/constants";

export function SubmissionStatusSelect({ submissionId, status }: { submissionId: string; status: ApplicationStatus }) {
  const router = useRouter();

  return (
    <Select
      value={status}
      onValueChange={async (value) => {
        const result = await updateApplicationStatus(submissionId, value as ApplicationStatus);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        router.refresh();
      }}
    >
      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {APPLICATION_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
