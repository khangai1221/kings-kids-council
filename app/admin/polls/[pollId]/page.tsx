import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { PollStatusActions } from "@/app/admin/polls/[pollId]/poll-status-actions";

export default async function AdminPollDetailPage({ params }: { params: Promise<{ pollId: string }> }) {
  await requireCapability("polls.manage");
  const { pollId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: poll } = await supabase.from("polls").select("*").eq("id", pollId).maybeSingle();
  if (!poll) notFound();

  const [{ data: options }, { data: counts }] = await Promise.all([
    supabase.from("poll_options").select("*").eq("poll_id", poll.id).order("sort_order"),
    supabase.rpc("get_poll_option_counts", { p_poll_id: poll.id }),
  ]);

  const countByOption = new Map((counts ?? []).map((c) => [c.option_id, c.votes]));
  const totalVotes = (counts ?? []).reduce((sum, c) => sum + c.votes, 0);

  return (
    <div className="max-w-xl">
      <PageHeader title={poll.title} description={poll.description ?? undefined} actions={<StatusBadge status={poll.status} />} />

      <div className="mb-6">
        <PollStatusActions pollId={poll.id} status={poll.status} />
      </div>

      <div className="space-y-3">
        {(options ?? []).map((option) => {
          const votes = countByOption.get(option.id) ?? 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          return (
            <div key={option.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{option.label}</span>
                <span className="text-muted-foreground">{votes} · {pct}%</span>
              </div>
              <Progress value={pct} />
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">{totalVotes} total vote{totalVotes === 1 ? "" : "s"}</p>
      </div>
    </div>
  );
}
