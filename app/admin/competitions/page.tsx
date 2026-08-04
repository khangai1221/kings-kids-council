import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreateEventDialog } from "@/app/admin/events/create-event-dialog";

export const metadata = { title: "Competitions" };

export default async function AdminCompetitionsPage() {
  await requireCapability("events.manage");
  const supabase = createSupabaseServerClient();

  const { data: categories } = await supabase.from("event_categories").select("*").order("sort_order");
  const competitionCategory = (categories ?? []).find((c) => c.key === "competition");

  const { data: competitions } = competitionCategory
    ? await supabase.from("events").select("*").eq("category_id", competitionCategory.id).order("starts_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <PageHeader
        title="Competitions"
        description="Manage school & council competitions."
        actions={<CreateEventDialog categories={categories ?? []} defaultCategoryKey="competition" triggerLabel="New competition" />}
      />
      {!competitions || competitions.length === 0 ? (
        <EmptyState icon={Trophy} title="No competitions yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Starts</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {competitions.map((competition) => (
                <TableRow key={competition.id}>
                  <TableCell data-label="Title" className="font-medium">{competition.title}</TableCell>
                  <TableCell data-label="Starts">{new Date(competition.starts_at).toLocaleDateString()}</TableCell>
                  <TableCell data-label="Status"><StatusBadge status={competition.status} /></TableCell>
                  <TableCell data-label=""><Button asChild size="sm" variant="outline"><Link href={`/admin/competitions/${competition.id}`}>Manage</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
