"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCouncilMemberStatus } from "@/actions/council";

export function MemberStatusSelect({ memberId, status }: { memberId: string; status: string }) {
  const router = useRouter();
  return (
    <Select
      value={status}
      onValueChange={async (value) => {
        const result = await updateCouncilMemberStatus(memberId, value as "draft" | "published" | "archived");
        if (!result.success) toast.error(result.error);
        else router.refresh();
      }}
    >
      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="published">Published</SelectItem>
        <SelectItem value="archived">Archived</SelectItem>
      </SelectContent>
    </Select>
  );
}
