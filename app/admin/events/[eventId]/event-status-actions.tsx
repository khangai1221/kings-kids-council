"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateEventStatus } from "@/actions/events";
import { EVENT_STATUSES, type EventStatus } from "@/lib/constants";

export function EventStatusActions({ eventId, status }: { eventId: string; status: EventStatus }) {
  const router = useRouter();

  async function handleChange(next: EventStatus) {
    let reason: string | undefined;
    if (next === "cancelled") {
      reason = window.prompt("Reason for cancellation (shown to registered students):") ?? undefined;
      if (reason === undefined) return;
    }
    const result = await updateEventStatus(eventId, next, reason);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Event ${next.replace("_", " ")}.`);
    router.refresh();
  }

  if (status === "cancelled") return null;

  return (
    <Select value="" onValueChange={(v) => handleChange(v as EventStatus)}>
      <SelectTrigger className="w-44"><SelectValue placeholder="Change status" /></SelectTrigger>
      <SelectContent>
        {EVENT_STATUSES.filter((s) => s !== status).map((s) => (
          <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
