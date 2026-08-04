"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { castPollVote } from "@/actions/polls";
import type { PollOptionRow } from "@/types/database";

interface PollVoteFormProps {
  pollId: string;
  canVote: boolean;
  options: PollOptionRow[];
  votedOptionId: string | null;
  showResults: boolean;
  counts: { option_id: string; votes: number }[];
}

export function PollVoteForm({ pollId, canVote, options, votedOptionId, showResults, counts }: PollVoteFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const countByOption = new Map(counts.map((c) => [c.option_id, c.votes]));
  const totalVotes = counts.reduce((sum, c) => sum + c.votes, 0);

  async function handleVote() {
    if (!selected) return;
    setIsPending(true);
    const result = await castPollVote(pollId, selected);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Your vote has been recorded.");
    router.refresh();
  }

  if (showResults) {
    return (
      <div className="space-y-3">
        {votedOptionId ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" /> You voted.
          </p>
        ) : null}
        {options.map((option) => {
          const votes = countByOption.get(option.id) ?? 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isMine = option.id === votedOptionId;
          return (
            <div key={option.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={isMine ? "font-semibold text-foreground" : "text-foreground"}>
                  {option.label}
                  {isMine ? " (your vote)" : ""}
                </span>
                <span className="text-muted-foreground">{votes} · {pct}%</span>
              </div>
              <Progress value={pct} />
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">{totalVotes} total vote{totalVotes === 1 ? "" : "s"}</p>
      </div>
    );
  }

  if (!canVote) {
    return <p className="text-sm text-muted-foreground">This poll is not currently open for voting.</p>;
  }

  return (
    <div className="space-y-4">
      <RadioGroup value={selected ?? undefined} onValueChange={setSelected}>
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-2">
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="font-normal">{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
      <Button onClick={handleVote} disabled={!selected || isPending}>{isPending ? "Submitting…" : "Submit vote"}</Button>
    </div>
  );
}
