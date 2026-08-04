"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createPoll } from "@/actions/polls";

export function CreatePollDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", options: "", opensAt: "", closesAt: "" });

  async function handleCreate() {
    const options = form.options.split("\n").map((o) => o.trim()).filter(Boolean);
    if (!form.title.trim() || options.length < 2) {
      toast.error("Add a title and at least two options.");
      return;
    }
    setIsSubmitting(true);
    const result = await createPoll({
      title: form.title,
      description: form.description,
      options,
      opensAt: form.opensAt ? new Date(form.opensAt).toISOString() : "",
      closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : "",
      status: "draft",
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    router.push(`/admin/polls/${result.data.pollId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="size-4" /> New poll</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create poll</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Question</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Description (optional)</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="space-y-1.5">
            <Label>Options (one per line)</Label>
            <Textarea rows={4} placeholder={"Option A\nOption B\nOption C"} value={form.options} onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Opens (optional)</Label><Input type="datetime-local" value={form.opensAt} onChange={(e) => setForm((f) => ({ ...f, opensAt: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Closes (optional)</Label><Input type="datetime-local" value={form.closesAt} onChange={(e) => setForm((f) => ({ ...f, closesAt: e.target.value }))} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
