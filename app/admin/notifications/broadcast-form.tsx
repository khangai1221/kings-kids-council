"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { broadcastNotification } from "@/actions/admin-notifications";
import type { GradeLevelRow } from "@/types/database";

export function BroadcastForm({ gradeLevels }: { gradeLevels: GradeLevelRow[] }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"all" | "grade">("all");
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      toast.error("Fill in both the title and message.");
      return;
    }
    setIsSubmitting(true);
    const result = await broadcastNotification({ title, message, audience, gradeLevelId: gradeLevelId || undefined });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Sent to ${result.data.recipientCount} student(s).`);
    setTitle(""); setMessage("");
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Message</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label>Audience</Label>
        <Select value={audience} onValueChange={(v) => setAudience(v as "all" | "grade")}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All active students</SelectItem>
            <SelectItem value="grade">Specific grade</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {audience === "grade" ? (
        <div className="space-y-1.5">
          <Label>Grade</Label>
          <Select value={gradeLevelId} onValueChange={setGradeLevelId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent>{gradeLevels.map((g) => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ) : null}
      <Button onClick={handleSend} disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send notification"}</Button>
    </div>
  );
}
