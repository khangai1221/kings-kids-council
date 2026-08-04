import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReplyForm } from "@/app/(portal)/suggestions/[suggestionId]/reply-form";

export default async function SuggestionDetailPage({ params }: { params: Promise<{ suggestionId: string }> }) {
  await requireOnboardedUser();
  const { suggestionId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: suggestion } = await supabase.from("suggestions").select("*").eq("id", suggestionId).maybeSingle();
  if (!suggestion) notFound();

  const { data: replies } = await supabase.from("suggestion_replies").select("*").eq("suggestion_id", suggestionId).order("created_at");

  return (
    <div className="max-w-2xl">
      <PageHeader title={suggestion.subject} actions={<StatusBadge status={suggestion.status} />} />

      <Card className="mb-6">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">{suggestion.message}</p>
          {suggestion.proposed_solution ? (
            <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Proposed solution: </span>{suggestion.proposed_solution}</p>
          ) : null}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-foreground">Conversation</h2>
      <div className="mb-4 space-y-3">
        {(replies ?? []).map((reply) => (
          <div key={reply.id} className={`rounded-lg border p-3 text-sm ${reply.author_type === "admin" ? "border-primary/30 bg-primary/5" : "border-border"}`}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{reply.author_type === "admin" ? "Student Council" : "You"}</p>
            <p className="whitespace-pre-wrap text-foreground">{reply.message}</p>
          </div>
        ))}
        {(!replies || replies.length === 0) ? <p className="text-sm text-muted-foreground">No replies yet.</p> : null}
      </div>

      {suggestion.status !== "closed" && suggestion.status !== "spam" ? <ReplyForm suggestionId={suggestionId} /> : null}
    </div>
  );
}
