"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateElectionStatus } from "@/actions/elections";
import type { ElectionStatus } from "@/lib/constants";

const TRANSITIONS: Record<ElectionStatus, { label: string; next: ElectionStatus; destructive?: boolean }[]> = {
  draft: [{ label: "Schedule", next: "scheduled" }],
  scheduled: [{ label: "Open voting", next: "open" }, { label: "Cancel", next: "cancelled", destructive: true }],
  open: [{ label: "Pause", next: "paused" }, { label: "Close", next: "closed" }],
  paused: [{ label: "Resume", next: "open" }, { label: "Close", next: "closed" }],
  closed: [{ label: "Publish results", next: "results_published" }],
  results_published: [{ label: "Archive", next: "archived" }],
  cancelled: [],
  archived: [],
};

export function ElectionStatusActions({ electionId, status }: { electionId: string; status: ElectionStatus }) {
  const router = useRouter();
  const transitions = TRANSITIONS[status] ?? [];

  async function apply(next: ElectionStatus) {
    const result = await updateElectionStatus(electionId, next);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Election ${next.replace("_", " ")}.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((transition) =>
        transition.destructive ? (
          <ConfirmDialog
            key={transition.next}
            trigger={<Button variant="outline" size="sm">{transition.label}</Button>}
            title={`${transition.label}?`}
            description="This action is recorded in the audit log."
            destructive
            onConfirm={() => apply(transition.next)}
          />
        ) : (
          <Button key={transition.next} size="sm" variant="outline" onClick={() => apply(transition.next)}>
            {transition.label}
          </Button>
        ),
      )}
    </div>
  );
}
