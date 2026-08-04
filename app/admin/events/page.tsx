import Link from "next/link";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreateEventDialog } from "@/app/admin/events/create-event-dialog";
import { CalendarDays } from "lucide-react";

export const metadata = { title: "Events" };

export default async function AdminEventsPage() {
  await requireCapability("events.manage");
  const supabase = createSupabaseServerClient();
  const [{ data: events }, { data: categories }] = await Promise.all([
    supabase.from("events").select("*").order("starts_at", { ascending: false }),
    supabase.from("event_categories").select("*").order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader title="Events" description="Manage events and competitions." actions={<CreateEventDialog categories={categories ?? []} />} />
      {!events || events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Starts</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell data-label="Title" className="font-medium">{event.title}</TableCell>
                  <TableCell data-label="Starts">{new Date(event.starts_at).toLocaleDateString()}</TableCell>
                  <TableCell data-label="Status"><StatusBadge status={event.status} /></TableCell>
                  <TableCell data-label=""><Button asChild size="sm" variant="outline"><Link href={`/admin/events/${event.id}`}>Manage</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
