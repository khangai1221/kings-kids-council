import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PollVoteForm } from "@/app/(portal)/polls/[pollSlug]/poll-vote-form";

export default async function PollDetailPage({ params }: { params: Promise<{ pollSlug: string }> }) {
  const user = await requireOnboardedUser();
  const { pollSlug } = await params;
  const supabase = createSupabaseServerClient();

  const { data: poll } = await supabase.from("polls").select("*").eq("slug", pollSlug).maybeSingle();
  if (!poll) notFound();

  const [{ data: options }, { data: myVote }] = await Promise.all([
    supabase.from("poll_options").select("*").eq("poll_id", poll.id).order("sort_order"),
    supabase.from("poll_votes").select("option_id").eq("poll_id", poll.id).eq("student_id", user.profile.id).maybeSingle(),
  ]);

  const showResults = Boolean(myVote) || poll.status === "closed" || poll.status === "archived";
  let counts: { option_id: string; votes: number }[] = [];
  if (showResults) {
    const { data } = await supabase.rpc("get_poll_option_counts", { p_poll_id: poll.id });
    counts = (data ?? []) as { option_id: string; votes: number }[];
  }

  return (
    <div className="max-w-xl">
      <PageHeader title={poll.title} description={poll.description ?? undefined} actions={<StatusBadge status={poll.status} />} />

      <PollVoteForm
        pollId={poll.id}
        canVote={poll.status === "open" && !myVote}
        options={options ?? []}
        votedOptionId={myVote?.option_id ?? null}
        showResults={showResults}
        counts={counts}
      />
    </div>
  );
}
