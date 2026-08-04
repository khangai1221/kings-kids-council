"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updatePollStatus } from "@/actions/polls";
import { POLL_STATUSES, type PollStatus } from "@/lib/constants";

export function PollStatusActions({ pollId, status }: { pollId: string; status: PollStatus }) {
  const router = useRouter();

  async function handleChange(next: PollStatus) {
    const result = await updatePollStatus(pollId, next);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Poll ${next}.`);
    router.refresh();
  }

  return (
    <Select value="" onValueChange={(v) => handleChange(v as PollStatus)}>
      <SelectTrigger className="w-44"><SelectValue placeholder="Change status" /></SelectTrigger>
      <SelectContent>
        {POLL_STATUSES.filter((s) => s !== status).map((s) => (
          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
