"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateFaqStatus } from "@/actions/faq";
import { FAQ_STATUSES, type FaqStatus } from "@/lib/constants";

export function FaqStatusSelect({ id, status }: { id: string; status: FaqStatus }) {
  const router = useRouter();
  return (
    <Select
      value={status}
      onValueChange={async (value) => {
        const result = await updateFaqStatus(id, value as FaqStatus);
        if (!result.success) toast.error(result.error);
        else router.refresh();
      }}
    >
      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>{FAQ_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
    </Select>
  );
}
