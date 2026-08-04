import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddMemberDialog } from "@/app/admin/council/add-member-dialog";
import { MemberStatusSelect } from "@/app/admin/council/member-status-select";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Council" };

export default async function AdminCouncilPage() {
  await requireCapability("council.manage");
  const supabase = createSupabaseServerClient();

  const { data: currentTerm } = await supabase.from("council_terms").select("*").eq("is_current", true).maybeSingle();
  if (!currentTerm) {
    return (
      <div>
        <PageHeader title="Council" />
        <EmptyState icon={ShieldCheck} title="No current council term configured." description="Create one via the database or seed data to get started." />
      </div>
    );
  }

  const [{ data: positions }, { data: members }] = await Promise.all([
    supabase.from("council_positions").select("*").eq("term_id", currentTerm.id).order("sort_order"),
    supabase.from("council_members").select("*, council_positions(title)").eq("term_id", currentTerm.id).order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader title="Council" description={currentTerm.title} actions={<AddMemberDialog termId={currentTerm.id} positions={positions ?? []} />} />
      {!members || members.length === 0 ? (
        <EmptyState title="No council members yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {members.map((member) => {
                const position = (member as unknown as { council_positions: { title: string } | null }).council_positions;
                return (
                  <TableRow key={member.id}>
                    <TableCell data-label="Name" className="font-medium">{member.display_name}</TableCell>
                    <TableCell data-label="Position">{position?.title ?? "—"}</TableCell>
                    <TableCell data-label="Status"><MemberStatusSelect memberId={member.id} status={member.status} /></TableCell>
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
