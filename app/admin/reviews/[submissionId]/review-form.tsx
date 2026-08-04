"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveReview } from "@/actions/reviews";
import type { ApplicationReviewScoreRow, ReviewRecommendation, ReviewRubricItemRow } from "@/types/database";

interface ReviewFormProps {
  submissionId: string;
  rubricItems: ReviewRubricItemRow[];
  initialScores: ApplicationReviewScoreRow[];
  initialRecommendation: string | null;
  initialComments: string;
  isSubmitted: boolean;
}

export function ReviewForm({ submissionId, rubricItems, initialScores, initialRecommendation, initialComments, isSubmitted }: ReviewFormProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number | "">>(
    Object.fromEntries(rubricItems.map((item) => [item.id, initialScores.find((s) => s.rubric_item_id === item.id)?.score ?? ""])),
  );
  const [recommendation, setRecommendation] = useState(initialRecommendation ?? "");
  const [comments, setComments] = useState(initialComments);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(submit: boolean) {
    setIsSaving(true);
    const result = await saveReview({
      submissionId,
      recommendation: recommendation || undefined,
      privateComments: comments,
      scores: rubricItems.filter((item) => scores[item.id] !== "").map((item) => ({ rubricItemId: item.id, score: Number(scores[item.id]) })),
      submit,
    });
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(submit ? "Review submitted." : "Draft saved.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {rubricItems.map((item) => (
        <div key={item.id} className="space-y-1.5">
          <Label>{item.label} <span className="text-xs text-muted-foreground">(weight {item.weight})</span></Label>
          <Input
            type="number"
            min={item.min_score}
            max={item.max_score}
            disabled={isSubmitted}
            value={scores[item.id]}
            onChange={(e) => setScores((prev) => ({ ...prev, [item.id]: e.target.value === "" ? "" : Number(e.target.value) }))}
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <Label>Recommendation</Label>
        <Select value={recommendation} onValueChange={setRecommendation} disabled={isSubmitted}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select a recommendation" /></SelectTrigger>
          <SelectContent>
            {(["accept", "waitlist", "reject", "needs_discussion"] as ReviewRecommendation[]).map((r) => (
              <SelectItem key={r} value={r} className="capitalize">{r.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Private comments</Label>
        <Textarea rows={5} value={comments} disabled={isSubmitted} onChange={(e) => setComments(e.target.value)} />
        <p className="text-xs text-muted-foreground">Never shown to the applicant.</p>
      </div>

      {!isSubmitted ? (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>Save draft</Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving}>Submit review</Button>
        </div>
      ) : (
        <p className="text-sm text-success">Review submitted.</p>
      )}
    </div>
  );
}
