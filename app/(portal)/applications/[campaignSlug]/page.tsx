import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ApplyButton } from "@/app/(portal)/applications/[campaignSlug]/apply-button";
import { RichText } from "@/components/shared/rich-text";

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignSlug: string }> }) {
  const user = await requireOnboardedUser();
  const { campaignSlug } = await params;
  const supabase = createSupabaseServerClient();

  const { data: campaign } = await supabase.from("application_campaigns").select("*").eq("slug", campaignSlug).maybeSingle();
  if (!campaign) notFound();

  const { data: positions } = await supabase
    .from("application_positions")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("sort_order");

  const { data: mySubmissions } = await supabase
    .from("application_submissions")
    .select("id, position_id, status")
    .eq("campaign_id", campaign.id)
    .eq("student_id", user.profile.id);

  const submissionByPosition = new Map((mySubmissions ?? []).map((s) => [s.position_id, s]));

  return (
    <div className="max-w-3xl">
      <PageHeader title={campaign.title} actions={<StatusBadge status={campaign.status} />} />
      {campaign.description ? <RichText content={campaign.description} className="mb-6" /> : null}

      {campaign.eligibility_requirements ? (
        <Card className="mb-6">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Eligibility: </span>
            {campaign.eligibility_requirements}
          </CardContent>
        </Card>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Available positions</h2>
      <div className="space-y-3">
        {(positions ?? []).map((position) => {
          const existing = submissionByPosition.get(position.id);
          return (
            <Card key={position.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{position.title}</p>
                  {position.description ? <p className="text-sm text-muted-foreground">{position.description}</p> : null}
                  {position.max_seats ? (
                    <p className="mt-1 text-xs text-muted-foreground">{position.max_seats} seat(s) available</p>
                  ) : null}
                </div>
                <ApplyButton
                  campaignId={campaign.id}
                  positionId={position.id}
                  campaignOpen={campaign.status === "open"}
                  existingSubmission={existing ?? null}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
