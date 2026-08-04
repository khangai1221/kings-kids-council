"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateAnnouncementStatus } from "@/actions/announcements";
import { ANNOUNCEMENT_STATUSES, type AnnouncementStatus } from "@/lib/constants";

export function AnnouncementStatusSelect({ id, status }: { id: string; status: AnnouncementStatus }) {
  const router = useRouter();
  return (
    <Select
      value={status}
      onValueChange={async (value) => {
        const result = await updateAnnouncementStatus(id, value as AnnouncementStatus);
        if (!result.success) toast.error(result.error);
        else router.refresh();
      }}
    >
      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>{ANNOUNCEMENT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
    </Select>
  );
}
