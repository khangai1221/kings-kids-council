import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from "lucide-react";

export const metadata = { title: "Audit Log" };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireCapability("audit.view");
  const { page } = await searchParams;
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = 50;

  const supabase = createSupabaseServerClient();
  const { data: entries } = await supabase
    .from("audit_logs")
    .select("*, profiles(display_name)")
    .order("created_at", { ascending: false })
    .range((pageNumber - 1) * pageSize, pageNumber * pageSize - 1);

  return (
    <div>
      <PageHeader title="Audit log" description="Complete history of sensitive administrative actions." />
      {!entries || entries.length === 0 ? (
        <EmptyState icon={History} title="No audit history yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Actor</TableHead><TableHead>Resource</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const actor = (entry as unknown as { profiles: { display_name: string } | null }).profiles;
                return (
                  <TableRow key={entry.id}>
                    <TableCell data-label="Action" className="font-medium capitalize">{entry.action.replace(/[._]/g, " ")}</TableCell>
                    <TableCell data-label="Actor">{actor?.display_name ?? entry.actor_role ?? "System"}</TableCell>
                    <TableCell data-label="Resource">{entry.resource_type}</TableCell>
                    <TableCell data-label="When">{new Date(entry.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
