import Link from "next/link";
import { Lightbulb, Plus } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Suggestions" };

export default async function SuggestionsPage() {
  await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const { data: suggestions } = await supabase.from("suggestions").select("*").order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Suggestions"
        description="Share ideas with the student council — identified or anonymous."
        actions={<Button asChild className="gap-1.5"><Link href="/suggestions/new"><Plus className="size-4" /> New suggestion</Link></Button>}
      />
      <p className="mb-4 text-xs text-muted-foreground">
        This is not an emergency channel — for urgent concerns, please contact a trusted school staff member.
      </p>
      {!suggestions || suggestions.length === 0 ? (
        <EmptyState icon={Lightbulb} title="You haven't submitted any suggestions yet." />
      ) : (
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <Link key={suggestion.id} href={`/suggestions/${suggestion.id}`}>
              <Card className="transition-colors hover:bg-secondary/40">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-foreground">{suggestion.subject}</p>
                    <p className="text-xs text-muted-foreground">{new Date(suggestion.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={suggestion.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
