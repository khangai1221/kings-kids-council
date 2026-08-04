import Link from "next/link";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

export const metadata = { title: "Suggestions" };

export default async function AdminSuggestionsPage() {
  await requireCapability("suggestions.manage");
  const supabase = createSupabaseServerClient();
  const { data: suggestions } = await supabase
    .from("suggestions")
    .select("*, suggestion_categories(label)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Suggestions" description="Student feedback inbox." />
      {!suggestions || suggestions.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No suggestions yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>Identity</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {suggestions.map((suggestion) => {
                const category = (suggestion as unknown as { suggestion_categories: { label: string } | null }).suggestion_categories;
                return (
                  <TableRow key={suggestion.id}>
                    <TableCell data-label="Subject" className="font-medium">{suggestion.subject}</TableCell>
                    <TableCell data-label="Category">{category?.label ?? "—"}</TableCell>
                    <TableCell data-label="Identity" className="capitalize">{suggestion.identity_mode.replace(/_/g, " ")}</TableCell>
                    <TableCell data-label="Status"><StatusBadge status={suggestion.status} /></TableCell>
                    <TableCell data-label=""><Button asChild size="sm" variant="outline"><Link href={`/admin/suggestions/${suggestion.id}`}>Open</Link></Button></TableCell>
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
