import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Competitions" };

export default async function CompetitionsPage() {
  await requireOnboardedUser();
  const supabase = createSupabaseServerClient();

  const { data: category } = await supabase.from("event_categories").select("id").eq("key", "competition").maybeSingle();

  const { data: competitions } = category
    ? await supabase
        .from("events")
        .select("*")
        .eq("category_id", category.id)
        .not("status", "in", "(draft,archived)")
        .order("starts_at")
    : { data: [] };

  return (
    <div>
      <PageHeader title="Competitions" description="Council & academic competitions open to students." />

      {!competitions || competitions.length === 0 ? (
        <EmptyState icon={Trophy} title="No competitions right now." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((competition) => (
            <Link key={competition.id} href={`/competitions/${competition.slug}`}>
              <Card className="h-full transition-colors hover:bg-secondary/40">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <StatusBadge status={competition.status} />
                    {competition.featured ? <span className="text-xs font-medium text-accent">Featured</span> : null}
                  </div>
                  <p className="font-semibold text-foreground">{competition.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(competition.starts_at).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
                    {competition.location ? ` · ${competition.location}` : ""}
                  </p>
                  {competition.short_description ? (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{competition.short_description}</p>
                  ) : null}
                  {competition.prizes ? <p className="mt-2 text-xs font-medium text-accent">Prizes: {competition.prizes}</p> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
