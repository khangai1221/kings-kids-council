"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSurvey } from "@/actions/surveys";
import type { SurveyMode } from "@/lib/constants";

export interface PublishedFormVersionOption {
  formVersionId: string;
  label: string;
}

export function CreateSurveyDialog({ forms }: { forms: PublishedFormVersionOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [formVersionId, setFormVersionId] = useState("");
  const [mode, setMode] = useState<SurveyMode>("anonymous");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !formVersionId || !opensAt || !closesAt) {
      toast.error("Fill in all fields.");
      return;
    }
    setIsSubmitting(true);
    const result = await createSurvey({
      title,
      mode,
      formVersionId,
      eligibleGradeLevelIds: [],
      opensAt: new Date(opensAt).toISOString(),
      closesAt: new Date(closesAt).toISOString(),
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    router.push(`/admin/surveys/${result.data.surveyId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="size-4" /> New survey</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create survey</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Form</Label>
            <Select value={formVersionId} onValueChange={setFormVersionId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a form" /></SelectTrigger>
              <SelectContent>{forms.map((f) => <SelectItem key={f.formVersionId} value={f.formVersionId}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as SurveyMode)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="anonymous">Anonymous</SelectItem>
                <SelectItem value="identified">Identified</SelectItem>
                <SelectItem value="anonymous_with_participation_tracking">Anonymous with participation tracking</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Opens</Label><Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Closes</Label><Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></div>
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
