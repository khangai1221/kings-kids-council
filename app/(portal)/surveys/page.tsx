import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Surveys" };

export default async function SurveysPage() {
  await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const { data: surveys } = await supabase.from("surveys").select("*").not("status", "in", "(draft,archived)").order("opens_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Surveys" description="Share your feedback with the student council." />
      {!surveys || surveys.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No surveys available right now." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Link key={survey.id} href={`/surveys/${survey.slug}`}>
              <Card className="h-full transition-colors hover:bg-secondary/40">
                <CardContent className="p-5">
                  <StatusBadge status={survey.status} />
                  <p className="mt-2 font-semibold text-foreground">{survey.title}</p>
                  {survey.description ? <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{survey.description}</p> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
