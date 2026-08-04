import Link from "next/link";
import { requireAnyCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateFormDialog } from "@/app/admin/forms/create-form-dialog";
import { FileEdit } from "lucide-react";

export const metadata = { title: "Forms" };

export default async function AdminFormsPage() {
  await requireAnyCapability(["forms.manage", "applications.manage", "surveys.manage", "events.manage"]);
  const supabase = createSupabaseServerClient();
  const { data: forms } = await supabase.from("forms").select("*").order("updated_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Forms"
        description="Reusable question sets shared by applications, surveys, and event registration."
        actions={<CreateFormDialog />}
      />

      {!forms || forms.length === 0 ? (
        <EmptyState icon={FileEdit} title="No forms yet" description="Create your first form to get started." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell data-label="Title" className="font-medium">{form.title}</TableCell>
                  <TableCell data-label="Kind" className="capitalize">{form.kind.replace("_", " ")}</TableCell>
                  <TableCell data-label="Status"><StatusBadge status={form.status} /></TableCell>
                  <TableCell data-label="Updated">{new Date(form.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell data-label="">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/forms/${form.id}`}>Open</Link>
                    </Button>
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
