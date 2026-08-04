"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCampaign, updateCampaign } from "@/actions/admin-applications";
import { CAMPAIGN_STATUSES } from "@/lib/constants";
import type { CampaignInput } from "@/lib/validation/application-campaign";
import type { ApplicationCampaignRow } from "@/types/database";
import type { PublishedFormVersionOption } from "@/lib/forms/published-versions";

interface CampaignFormDialogProps {
  campaign?: ApplicationCampaignRow;
  publishedForms: PublishedFormVersionOption[];
}

function toInputValue(dateString: string | null): string {
  if (!dateString) return "";
  return new Date(dateString).toISOString().slice(0, 16);
}

export function CampaignFormDialog({ campaign, publishedForms }: CampaignFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CampaignInput>({
    title: campaign?.title ?? "",
    description: campaign?.description ?? "",
    academicYear: campaign?.academic_year ?? "",
    openingAt: toInputValue(campaign?.opening_at ?? null),
    closingAt: toInputValue(campaign?.closing_at ?? null),
    eligibilityRequirements: campaign?.eligibility_requirements ?? "",
    eligibleGradeLevelIds: campaign?.eligible_grade_level_ids ?? [],
    formVersionId: campaign?.form_version_id ?? "",
    status: campaign?.status ?? "draft",
    confirmationMessage: campaign?.confirmation_message ?? "",
    contactEmail: campaign?.contact_email ?? "",
    allowReapply: campaign?.allow_reapply ?? false,
    blindReview: campaign?.blind_review ?? true,
    withdrawalDeadline: toInputValue(campaign?.withdrawal_deadline ?? null),
  });

  async function handleSubmit() {
    setIsSubmitting(true);
    const result = campaign ? await updateCampaign(campaign.id, form) : await createCampaign(form);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(campaign ? "Campaign updated." : "Campaign created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={campaign ? "outline" : "default"} size={campaign ? "sm" : "default"} className="gap-1.5">
          {campaign ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {campaign ? "Edit" : "New campaign"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit campaign" : "Create application campaign"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Opens</Label>
              <Input type="datetime-local" value={form.openingAt} onChange={(e) => setForm((f) => ({ ...f, openingAt: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Closes</Label>
              <Input type="datetime-local" value={form.closingAt} onChange={(e) => setForm((f) => ({ ...f, closingAt: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Application form</Label>
            <Select value={form.formVersionId} onValueChange={(v) => setForm((f) => ({ ...f, formVersionId: v }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a published form" /></SelectTrigger>
              <SelectContent>
                {publishedForms.map((f) => <SelectItem key={f.formVersionId} value={f.formVersionId}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CampaignInput["status"] }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAMPAIGN_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contact email</Label>
            <Input value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label className="font-normal">Allow re-applying to the same position</Label>
            <Switch checked={form.allowReapply} onCheckedChange={(v) => setForm((f) => ({ ...f, allowReapply: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label className="font-normal">Blind review (hide other reviewers&apos; scores until yours is submitted)</Label>
            <Switch checked={form.blindReview} onCheckedChange={(v) => setForm((f) => ({ ...f, blindReview: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
