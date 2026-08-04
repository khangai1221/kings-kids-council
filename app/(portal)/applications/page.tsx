import Link from "next/link";
import { FileText } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const { data: campaigns } = await supabase
    .from("application_campaigns")
    .select("*")
    .order("opening_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Applications" description="Apply for a position on the student council." />
      {!campaigns || campaigns.length === 0 ? (
        <EmptyState icon={FileText} title="No application campaigns right now." description="Check back when the next campaign opens." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/applications/${campaign.slug}`}>
              <Card className="h-full transition-colors hover:bg-secondary/40">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <StatusBadge status={campaign.status} />
                  </div>
                  <p className="font-semibold text-foreground">{campaign.title}</p>
                  {campaign.description ? <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{campaign.description}</p> : null}
                  {campaign.closing_at ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Closes {new Date(campaign.closing_at).toLocaleDateString()}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
