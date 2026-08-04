import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateFaqDialog } from "@/app/admin/faq/create-faq-dialog";
import { FaqStatusSelect } from "@/app/admin/faq/faq-status-select";
import { HelpCircle } from "lucide-react";

export const metadata = { title: "FAQ" };

export default async function AdminFaqPage() {
  await requireCapability("faq.manage");
  const supabase = createSupabaseServerClient();
  const [{ data: faqs }, { data: categories }] = await Promise.all([
    supabase.from("faqs").select("*").order("sort_order"),
    supabase.from("faq_categories").select("*").order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader title="FAQ" actions={<CreateFaqDialog categories={categories ?? []} />} />
      {!faqs || faqs.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No FAQ entries yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Question</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell data-label="Question" className="font-medium">{faq.question}</TableCell>
                  <TableCell data-label="Status"><FaqStatusSelect id={faq.id} status={faq.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
