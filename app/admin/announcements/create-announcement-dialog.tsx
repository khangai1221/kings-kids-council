"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAnnouncement } from "@/actions/announcements";
import { ANNOUNCEMENT_AUDIENCES, type AnnouncementAudience } from "@/lib/constants";

export function CreateAnnouncementDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", summary: "", content: "", audience: "all_students" as AnnouncementAudience, pinned: false, urgent: false,
  });

  async function handleCreate(publish: boolean) {
    if (!form.title.trim()) {
      toast.error("Enter a title.");
      return;
    }
    setIsSubmitting(true);
    const result = await createAnnouncement({ ...form, status: publish ? "published" : "draft" });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(publish ? "Announcement published." : "Draft saved.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="size-4" /> New announcement</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create announcement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Summary</Label><Input value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Content (Markdown supported)</Label><Textarea rows={5} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} /></div>
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v as AnnouncementAudience }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{ANNOUNCEMENT_AUDIENCES.map((a) => <SelectItem key={a} value={a} className="capitalize">{a.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label className="font-normal">Pinned</Label>
            <Switch checked={form.pinned} onCheckedChange={(v) => setForm((f) => ({ ...f, pinned: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label className="font-normal">Urgent (sends a push notification)</Label>
            <Switch checked={form.urgent} onCheckedChange={(v) => setForm((f) => ({ ...f, urgent: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleCreate(false)} disabled={isSubmitting}>Save draft</Button>
          <Button onClick={() => handleCreate(true)} disabled={isSubmitting}>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
