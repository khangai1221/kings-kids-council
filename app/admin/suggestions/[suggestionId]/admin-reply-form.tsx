"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminReplyToSuggestion, updateSuggestionStatus } from "@/actions/suggestions";
import { SUGGESTION_STATUSES, type SuggestionStatus } from "@/lib/constants";

export function AdminReplyForm({ suggestionId, status }: { suggestionId: string; status: SuggestionStatus }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReply() {
    if (!message.trim()) return;
    setIsSubmitting(true);
    const result = await adminReplyToSuggestion(suggestionId, message);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setMessage("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Status</label>
        <Select
          value={status}
          onValueChange={async (value) => {
            const result = await updateSuggestionStatus(suggestionId, value as SuggestionStatus);
            if (!result.success) toast.error(result.error);
            else router.refresh();
          }}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUGGESTION_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reply to the student…" rows={3} />
        <Button size="sm" onClick={handleReply} disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send reply"}</Button>
      </div>
    </div>
  );
}
