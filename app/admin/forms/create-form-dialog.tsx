"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createForm } from "@/actions/forms";
import type { FormKind } from "@/lib/constants";

export function CreateFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<FormKind>("application");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Enter a title.");
      return;
    }
    setIsSubmitting(true);
    const result = await createForm({ kind, title });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    router.push(`/admin/forms/${result.data.formId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="size-4" /> Create form
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new form</DialogTitle>
          <DialogDescription>You can add questions and publish it after creating it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="form-title">Title</Label>
            <Input id="form-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2027 Council Application" />
          </div>
          <div className="space-y-1.5">
            <Label>Used for</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as FormKind)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="application">Council application</SelectItem>
                <SelectItem value="survey">Survey</SelectItem>
                <SelectItem value="event_registration">Event registration</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
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
