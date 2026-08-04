import Link from "next/link";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CampaignFormDialog } from "@/app/admin/applications/campaign-form-dialog";
import { listPublishedFormVersions } from "@/lib/forms/published-versions";
import { FileText } from "lucide-react";

export const metadata = { title: "Applications" };

export default async function AdminApplicationsPage() {
  await requireCapability("applications.manage");
  const supabase = createSupabaseServerClient();
  const [{ data: campaigns }, forms] = await Promise.all([
    supabase.from("application_campaigns").select("*").order("created_at", { ascending: false }),
    listPublishedFormVersions("application"),
  ]);

  return (
    <div>
      <PageHeader title="Applications" description="Manage council application campaigns." actions={<CampaignFormDialog publishedForms={forms ?? []} />} />
      {!campaigns || campaigns.length === 0 ? (
        <EmptyState icon={FileText} title="No campaigns yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader>
              <TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Closes</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell data-label="Title" className="font-medium">{campaign.title}</TableCell>
                  <TableCell data-label="Status"><StatusBadge status={campaign.status} /></TableCell>
                  <TableCell data-label="Closes">{campaign.closing_at ? new Date(campaign.closing_at).toLocaleDateString() : "—"}</TableCell>
                  <TableCell data-label="">
                    <Button asChild size="sm" variant="outline"><Link href={`/admin/applications/${campaign.id}`}>Manage</Link></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
