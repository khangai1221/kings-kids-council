import Link from "next/link";
import { requireStaffAccess } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminTier } from "@/lib/permissions/roles";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const user = await requireStaffAccess();
  const supabase = createSupabaseServerClient();
  const isReviewerOnly = !isAdminTier(user.effectiveRoles);

  const query = supabase
    .from("review_assignments")
    .select(
      "id, status, conflict_of_interest, submission_id, application_submissions(id, status, profiles(display_name), application_positions(title), application_campaigns(title))",
    )
    .order("assigned_at", { ascending: false });

  const { data: assignments } = isReviewerOnly ? await query.eq("reviewer_id", user.profile.id) : await query;

  return (
    <div>
      <PageHeader title="Reviews" description={isReviewerOnly ? "Applications assigned to you." : "All reviewer assignments."} />
      {!assignments || assignments.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No assignments yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader>
              <TableRow><TableHead>Applicant</TableHead><TableHead>Position</TableHead><TableHead>Application status</TableHead><TableHead>Review status</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const submission = (assignment as unknown as {
                  application_submissions: {
                    id: string;
                    status: string;
                    profiles: { display_name: string };
                    application_positions: { title: string };
                    application_campaigns: { title: string };
                  };
                }).application_submissions;
                if (!submission) return null;
                return (
                  <TableRow key={assignment.id}>
                    <TableCell data-label="Applicant">{submission.profiles?.display_name}</TableCell>
                    <TableCell data-label="Position">{submission.application_positions?.title}</TableCell>
                    <TableCell data-label="Application status"><StatusBadge status={submission.status} /></TableCell>
                    <TableCell data-label="Review status"><StatusBadge status={assignment.status} /></TableCell>
                    <TableCell data-label="">
                      <Button asChild size="sm" variant="outline"><Link href={`/admin/reviews/${submission.id}`}>Review</Link></Button>
                    </TableCell>
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
