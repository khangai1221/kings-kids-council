import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions/capabilities";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { RevealIdentityButton } from "@/app/admin/suggestions/[suggestionId]/reveal-identity-button";
import { AdminReplyForm } from "@/app/admin/suggestions/[suggestionId]/admin-reply-form";

export default async function AdminSuggestionDetailPage({ params }: { params: Promise<{ suggestionId: string }> }) {
  const user = await requireCapability("suggestions.manage");
  const { suggestionId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: suggestion } = await supabase.from("suggestions").select("*").eq("id", suggestionId).maybeSingle();
  if (!suggestion) notFound();

  const { data: replies } = await supabase.from("suggestion_replies").select("*").eq("suggestion_id", suggestionId).order("created_at");
  const canRevealIdentity = can(user.effectiveRoles, user.capabilities, "suggestions.manage_restricted");

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={suggestion.subject}
        actions={
          <>
            <StatusBadge status={suggestion.status} />
            {suggestion.identity_mode === "anonymous_to_council" && canRevealIdentity ? (
              <RevealIdentityButton suggestionId={suggestionId} />
            ) : null}
          </>
        }
      />

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="whitespace-pre-wrap text-foreground">{suggestion.message}</p>
          {suggestion.proposed_solution ? <p className="text-muted-foreground"><span className="font-medium text-foreground">Proposed solution: </span>{suggestion.proposed_solution}</p> : null}
          <p className="text-xs text-muted-foreground capitalize">Identity: {suggestion.identity_mode.replace(/_/g, " ")}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(replies ?? []).map((reply) => (
          <div key={reply.id} className={`rounded-lg border p-3 text-sm ${reply.author_type === "admin" ? "border-primary/30 bg-primary/5" : "border-border"}`}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{reply.author_type === "admin" ? "Council" : "Student"}</p>
            <p className="whitespace-pre-wrap">{reply.message}</p>
          </div>
        ))}
      </div>

      <AdminReplyForm suggestionId={suggestionId} status={suggestion.status} />
    </div>
  );
}
