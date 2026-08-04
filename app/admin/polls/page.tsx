import Link from "next/link";
import { Vote } from "lucide-react";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreatePollDialog } from "@/app/admin/polls/create-poll-dialog";

export const metadata = { title: "Polls" };

export default async function AdminPollsPage() {
  await requireCapability("polls.manage");
  const supabase = createSupabaseServerClient();

  const [{ data: polls }, { data: votes }] = await Promise.all([
    supabase.from("polls").select("*").order("created_at", { ascending: false }),
    supabase.from("poll_votes").select("poll_id"),
  ]);

  const votesByPoll = new Map<string, number>();
  for (const vote of votes ?? []) {
    votesByPoll.set(vote.poll_id, (votesByPoll.get(vote.poll_id) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader title="Polls" description="Manage single-question polls." actions={<CreatePollDialog />} />
      {!polls || polls.length === 0 ? (
        <EmptyState icon={Vote} title="No polls yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Votes</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {polls.map((poll) => (
                <TableRow key={poll.id}>
                  <TableCell data-label="Title" className="font-medium">{poll.title}</TableCell>
                  <TableCell data-label="Votes">{votesByPoll.get(poll.id) ?? 0}</TableCell>
                  <TableCell data-label="Status"><StatusBadge status={poll.status} /></TableCell>
                  <TableCell data-label=""><Button asChild size="sm" variant="outline"><Link href={`/admin/polls/${poll.id}`}>Manage</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
