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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFaq } from "@/actions/faq";
import type { FaqCategoryRow } from "@/types/database";

export function CreateFaqDialog({ categories }: { categories: FaqCategoryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate(publish: boolean) {
    if (!question.trim() || !answer.trim()) {
      toast.error("Fill in both the question and answer.");
      return;
    }
    setIsSubmitting(true);
    const result = await createFaq({ categoryId, question, answer, status: publish ? "published" : "draft" });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setQuestion(""); setAnswer("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="size-4" /> New FAQ</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create FAQ entry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Question</Label><Input value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Answer</Label><Textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleCreate(false)} disabled={isSubmitting}>Save draft</Button>
          <Button onClick={() => handleCreate(true)} disabled={isSubmitting}>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
