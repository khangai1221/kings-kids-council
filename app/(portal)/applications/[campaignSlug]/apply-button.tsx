"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { startApplication } from "@/actions/applications";
import { StatusBadge } from "@/components/shared/status-badge";

interface ApplyButtonProps {
  campaignId: string;
  positionId: string;
  campaignOpen: boolean;
  existingSubmission: { id: string; status: string } | null;
}

export function ApplyButton({ campaignId, positionId, campaignOpen, existingSubmission }: ApplyButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  if (existingSubmission) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={existingSubmission.status} />
        <Button asChild size="sm" variant="outline">
          <Link href={`/applications/submissions/${existingSubmission.id}`}>
            {existingSubmission.status === "draft" ? "Continue" : "View"}
          </Link>
        </Button>
      </div>
    );
  }

  async function handleApply() {
    setIsPending(true);
    const result = await startApplication(campaignId, positionId);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.push(`/applications/submissions/${result.data.submissionId}`);
  }

  return (
    <Button size="sm" onClick={handleApply} disabled={!campaignOpen || isPending}>
      {isPending ? "Starting…" : "Apply"}
    </Button>
  );
}
