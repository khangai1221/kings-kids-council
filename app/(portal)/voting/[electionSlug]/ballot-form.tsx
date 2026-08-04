"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { castElectionVote } from "@/actions/elections";
import type { ElectionCandidateRow, ElectionPositionRow } from "@/types/database";

interface BallotFormProps {
  electionId: string;
  positions: (ElectionPositionRow & { candidates: ElectionCandidateRow[] })[];
}

export function BallotForm({ electionId, positions }: BallotFormProps) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function toggleCandidate(positionId: string, candidateId: string, maxChoices: number) {
    setSelections((prev) => {
      const current = prev[positionId] ?? [];
      if (current.includes(candidateId)) {
        return { ...prev, [positionId]: current.filter((id) => id !== candidateId) };
      }
      if (maxChoices === 1) return { ...prev, [positionId]: [candidateId] };
      if (current.length >= maxChoices) {
        toast.error(`You may select up to ${maxChoices} candidate(s) for this position.`);
        return prev;
      }
      return { ...prev, [positionId]: [...current, candidateId] };
    });
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    const result = await castElectionVote({
      electionId,
      ballot: positions.map((position) => ({ position_id: position.id, candidate_ids: selections[position.id] ?? [] })),
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setConfirmed(true);
    toast.success("Your vote has been recorded.");
    router.refresh();
  }

  if (confirmed) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-6 text-center">
          <p className="font-medium text-success">Your ballot was submitted successfully.</p>
          <p className="mt-1 text-sm text-muted-foreground">Your choices are recorded anonymously.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {positions.map((position) => (
        <div key={position.id}>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            {position.title} {position.max_choices > 1 ? <span className="text-sm font-normal text-muted-foreground">(choose up to {position.max_choices})</span> : null}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {position.candidates.map((candidate) => {
              const selected = (selections[position.id] ?? []).includes(candidate.id);
              return (
                <button
                  type="button"
                  key={candidate.id}
                  onClick={() => toggleCandidate(position.id, candidate.id, position.max_choices)}
                  aria-pressed={selected}
                  className={`rounded-lg border p-4 text-left transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40"}`}
                >
                  <div className="flex items-center gap-3">
                    {candidate.photo_url ? (
                      <Image src={candidate.photo_url} alt="" width={48} height={48} className="size-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {candidate.candidate_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{candidate.candidate_name}</p>
                      {candidate.grade_level_label ? <p className="text-xs text-muted-foreground">{candidate.grade_level_label}</p> : null}
                    </div>
                  </div>
                  {candidate.statement ? <p className="mt-2 text-sm text-muted-foreground">{candidate.statement}</p> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
        {isSubmitting ? "Submitting…" : "Submit ballot"}
      </Button>
    </div>
  );
}
