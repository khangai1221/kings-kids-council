import Link from "next/link";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreateElectionDialog } from "@/app/admin/elections/create-election-dialog";
import { Vote } from "lucide-react";

export const metadata = { title: "Elections" };

export default async function AdminElectionsPage() {
  await requireCapability("elections.manage");
  const supabase = createSupabaseServerClient();
  const [{ data: elections }, { data: gradeLevels }] = await Promise.all([
    supabase.from("elections").select("*").order("created_at", { ascending: false }),
    supabase.from("grade_levels").select("*").order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader title="Elections" description="Manage student council elections." actions={<CreateElectionDialog gradeLevels={gradeLevels ?? []} />} />
      {!elections || elections.length === 0 ? (
        <EmptyState icon={Vote} title="No elections yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader>
              <TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Closes</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {elections.map((election) => (
                <TableRow key={election.id}>
                  <TableCell data-label="Title" className="font-medium">{election.title}</TableCell>
                  <TableCell data-label="Status"><StatusBadge status={election.status} /></TableCell>
                  <TableCell data-label="Closes">{new Date(election.closes_at).toLocaleDateString()}</TableCell>
                  <TableCell data-label="">
                    <Button asChild size="sm" variant="outline"><Link href={`/admin/elections/${election.id}`}>Manage</Link></Button>
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
