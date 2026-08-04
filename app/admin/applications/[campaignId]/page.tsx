import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CampaignFormDialog } from "@/app/admin/applications/campaign-form-dialog";
import { PositionManager } from "@/app/admin/applications/[campaignId]/position-manager";
import { SubmissionStatusSelect } from "@/app/admin/applications/[campaignId]/submission-status-select";
import { listPublishedFormVersions } from "@/lib/forms/published-versions";

export default async function AdminCampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  await requireCapability("applications.manage");
  const { campaignId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: campaign } = await supabase.from("application_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!campaign) notFound();

  const [{ data: positions }, { data: submissions }, forms] = await Promise.all([
    supabase.from("application_positions").select("*").eq("campaign_id", campaignId).order("sort_order"),
    supabase
      .from("application_submissions")
      .select("id, status, submitted_at, profiles(display_name, school_email), application_positions(title)")
      .eq("campaign_id", campaignId)
      .order("submitted_at", { ascending: false }),
    listPublishedFormVersions("application"),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title={campaign.title} actions={<><StatusBadge status={campaign.status} /><CampaignFormDialog campaign={campaign} publishedForms={forms} /></>} />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Positions</h2>
        <PositionManager campaignId={campaignId} positions={positions ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Submissions</h2>
        {!submissions || submissions.length === 0 ? (
          <EmptyState title="No submissions yet." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table className="responsive-table">
              <TableHeader>
                <TableRow><TableHead>Student</TableHead><TableHead>Position</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => {
                  const profile = (submission as unknown as { profiles: { display_name: string; school_email: string } }).profiles;
                  const position = (submission as unknown as { application_positions: { title: string } }).application_positions;
                  return (
                    <TableRow key={submission.id}>
                      <TableCell data-label="Student">{profile?.display_name ?? profile?.school_email}</TableCell>
                      <TableCell data-label="Position">{position?.title}</TableCell>
                      <TableCell data-label="Status">
                        <SubmissionStatusSelect submissionId={submission.id} status={submission.status} />
                      </TableCell>
                      <TableCell data-label="Submitted">
                        {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : "Draft"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
