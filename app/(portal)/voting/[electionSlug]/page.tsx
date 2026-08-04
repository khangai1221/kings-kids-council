import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { BallotForm } from "@/app/(portal)/voting/[electionSlug]/ballot-form";
import type { ElectionCandidateRow } from "@/types/database";

export default async function ElectionDetailPage({ params }: { params: Promise<{ electionSlug: string }> }) {
  await requireOnboardedUser();
  const { electionSlug } = await params;
  const supabase = createSupabaseServerClient();

  const { data: election } = await supabase.from("elections").select("*").eq("slug", electionSlug).maybeSingle();
  if (!election) notFound();

  const { data: positions } = await supabase
    .from("election_positions")
    .select("*, election_candidates(*)")
    .eq("election_id", election.id)
    .order("sort_order");

  const positionsWithCandidates = (positions ?? []).map((position) => ({
    ...position,
    candidates: ((position as unknown as { election_candidates: ElectionCandidateRow[] }).election_candidates ?? []).filter(
      (c) => c.approval_status === "approved",
    ),
  }));

  const votedFlags = await Promise.all(
    positionsWithCandidates.map((position) => supabase.rpc("has_voted_for_position", { p_election_position_id: position.id })),
  );
  const allVoted = votedFlags.length > 0 && votedFlags.every((flag) => flag.data === true);

  let results: { data: unknown[] | null } = { data: null };
  let turnout: { data: unknown[] | null } = { data: null };
  if (election.status === "closed" || election.status === "results_published") {
    results = await supabase.rpc("get_election_results", { p_election_id: election.id });
    turnout = await supabase.rpc("get_election_turnout", { p_election_id: election.id });
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={election.title} description={election.description ?? undefined} actions={<StatusBadge status={election.status} />} />

      {election.status === "open" && !allVoted ? (
        <>
          {election.instructions ? <p className="mb-6 text-sm text-muted-foreground">{election.instructions}</p> : null}
          <BallotForm electionId={election.id} positions={positionsWithCandidates} />
        </>
      ) : election.status === "open" && allVoted ? (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-6 text-center text-success">You have already voted in this election.</CardContent>
        </Card>
      ) : results.data ? (
        <ElectionResults results={results.data} turnout={turnout.data} />
      ) : (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Results are not available yet.</CardContent></Card>
      )}
    </div>
  );
}

function ElectionResults({ results, turnout }: { results: unknown[]; turnout: unknown[] | null }) {
  const rows = results as { position_title: string; candidate_name: string | null; vote_count: number; vote_percentage: number }[];
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    grouped.set(row.position_title, [...(grouped.get(row.position_title) ?? []), row]);
  }
  const turnoutRow = (turnout?.[0] ?? null) as { total_eligible: number; total_votes: number; turnout_percentage: number } | null;

  return (
    <div className="space-y-6">
      {turnoutRow ? (
        <p className="text-sm text-muted-foreground">
          Turnout: {turnoutRow.total_votes} of {turnoutRow.total_eligible} eligible students ({turnoutRow.turnout_percentage}%)
        </p>
      ) : null}
      {Array.from(grouped.entries()).map(([positionTitle, candidates]) => (
        <div key={positionTitle}>
          <h2 className="mb-2 text-lg font-semibold text-foreground">{positionTitle}</h2>
          <div className="space-y-2">
            {candidates
              .filter((c) => c.candidate_name)
              .sort((a, b) => b.vote_count - a.vote_count)
              .map((candidate) => (
                <div key={candidate.candidate_name} className="flex items-center gap-3">
                  <span className="w-32 truncate text-sm">{candidate.candidate_name}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${candidate.vote_percentage}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs text-muted-foreground">{candidate.vote_percentage}%</span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
