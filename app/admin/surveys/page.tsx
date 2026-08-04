import Link from "next/link";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPublishedFormVersions } from "@/lib/forms/published-versions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreateSurveyDialog } from "@/app/admin/surveys/create-survey-dialog";
import { ClipboardList } from "lucide-react";

export const metadata = { title: "Surveys" };

export default async function AdminSurveysPage() {
  await requireCapability("surveys.manage");
  const supabase = createSupabaseServerClient();
  const [{ data: surveys }, forms] = await Promise.all([
    supabase.from("surveys").select("*").order("created_at", { ascending: false }),
    listPublishedFormVersions("survey"),
  ]);

  return (
    <div>
      <PageHeader title="Surveys" description="Manage surveys and polls." actions={<CreateSurveyDialog forms={forms} />} />
      {!surveys || surveys.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No surveys yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Mode</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {surveys.map((survey) => (
                <TableRow key={survey.id}>
                  <TableCell data-label="Title" className="font-medium">{survey.title}</TableCell>
                  <TableCell data-label="Mode" className="capitalize">{survey.mode.replace(/_/g, " ")}</TableCell>
                  <TableCell data-label="Status"><StatusBadge status={survey.status} /></TableCell>
                  <TableCell data-label=""><Button asChild size="sm" variant="outline"><Link href={`/admin/surveys/${survey.id}`}>Manage</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
