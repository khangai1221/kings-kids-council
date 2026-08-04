import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ElectionStatusActions } from "@/app/admin/elections/[electionId]/election-status-actions";
import { AddCandidateDialog } from "@/app/admin/elections/[electionId]/add-candidate-dialog";

export default async function AdminElectionDetailPage({ params }: { params: Promise<{ electionId: string }> }) {
  await requireCapability("elections.manage");
  const { electionId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: election } = await supabase.from("elections").select("*").eq("id", electionId).maybeSingle();
  if (!election) notFound();

  const { data: positions } = await supabase
    .from("election_positions")
    .select("*, election_candidates(*)")
    .eq("election_id", electionId)
    .order("sort_order");

  const canPreviewResults = ["closed", "results_published"].includes(election.status);
  const results = canPreviewResults ? await supabase.rpc("get_election_results", { p_election_id: electionId }) : { data: null };
  const turnout = await supabase.rpc("get_election_turnout", { p_election_id: electionId });

  return (
    <div className="space-y-6">
      <PageHeader title={election.title} actions={<StatusBadge status={election.status} />} />
      <ElectionStatusActions electionId={electionId} status={election.status} />

      {turnout.data?.[0] ? (
        <p className="text-sm text-muted-foreground">
          Turnout: {(turnout.data[0] as { total_votes: number }).total_votes} / {(turnout.data[0] as { total_eligible: number }).total_eligible} (
          {(turnout.data[0] as { turnout_percentage: number }).turnout_percentage}%)
        </p>
      ) : null}

      {(positions ?? []).map((position) => (
        <Card key={position.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{position.title}</p>
              <AddCandidateDialog electionPositionId={position.id} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {((position as unknown as { election_candidates: { id: string; candidate_name: string; approval_status: string }[] }).election_candidates ?? []).map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{candidate.candidate_name}</span>
                  <StatusBadge status={candidate.approval_status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {results.data ? (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 font-medium text-foreground">Results preview</p>
            <ul className="space-y-1 text-sm">
              {(results.data as { position_title: string; candidate_name: string | null; vote_count: number; vote_percentage: number }[]).map((row, i) => (
                <li key={i} className="flex justify-between">
                  <span>{row.position_title} — {row.candidate_name ?? "Abstain"}</span>
                  <span className="text-muted-foreground">{row.vote_count} ({row.vote_percentage}%)</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
