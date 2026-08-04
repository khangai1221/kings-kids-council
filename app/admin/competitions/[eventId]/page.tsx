import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EventStatusActions } from "@/app/admin/events/[eventId]/event-status-actions";
import { RegistrationRowActions } from "@/app/admin/events/[eventId]/registration-row-actions";

export default async function AdminCompetitionDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  await requireCapability("events.manage");
  const { eventId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event) notFound();

  const { data: registrations } = await supabase
    .from("event_registrations")
    .select("id, status, waitlist_position, profiles(display_name, school_email), event_attendance(attended)")
    .eq("event_id", eventId)
    .order("registered_at");

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description="Competition details, rules, and registrations."
        actions={<><StatusBadge status={event.status} /><EventStatusActions eventId={eventId} status={event.status} /></>}
      />

      {(event.rules || event.required_materials || event.competition_format || event.prizes) ? (
        <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
          {event.competition_format ? <p><span className="font-medium text-foreground">Format: </span>{event.competition_format}</p> : null}
          {event.rules ? <p><span className="font-medium text-foreground">Rules: </span>{event.rules}</p> : null}
          {event.required_materials ? <p><span className="font-medium text-foreground">Required materials: </span>{event.required_materials}</p> : null}
          {event.prizes ? <p><span className="font-medium text-foreground">Prizes: </span>{event.prizes}</p> : null}
        </div>
      ) : null}

      {!registrations || registrations.length === 0 ? (
        <EmptyState title="No registrations yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {registrations.map((registration) => {
                const profile = (registration as unknown as { profiles: { display_name: string; school_email: string } }).profiles;
                const attendance = (registration as unknown as { event_attendance: { attended: boolean }[] }).event_attendance;
                return (
                  <TableRow key={registration.id}>
                    <TableCell data-label="Student">{profile?.display_name ?? profile?.school_email}</TableCell>
                    <TableCell data-label="Status">
                      <StatusBadge status={registration.status} />
                      {registration.waitlist_position ? <span className="ml-1 text-xs text-muted-foreground">#{registration.waitlist_position}</span> : null}
                    </TableCell>
                    <TableCell data-label="">
                      <RegistrationRowActions
                        eventId={eventId}
                        registrationId={registration.id}
                        status={registration.status}
                        attended={attendance?.[0]?.attended ?? false}
                      />
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
