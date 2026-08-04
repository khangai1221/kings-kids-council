"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addSuggestionReply } from "@/actions/suggestions";

export function ReplyForm({ suggestionId }: { suggestionId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!message.trim()) return;
    setIsSubmitting(true);
    const result = await addSuggestionReply(suggestionId, message);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setMessage("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a follow-up message…" rows={3} />
      <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send"}</Button>
    </div>
  );
}
