import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { RichText } from "@/components/shared/rich-text";
import { EventActions } from "@/app/(portal)/events/[eventSlug]/event-actions";
import { APP_TIMEZONE_FALLBACK } from "@/lib/constants";

export default async function EventDetailPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const user = await requireOnboardedUser();
  const { eventSlug } = await params;
  const supabase = createSupabaseServerClient();

  const { data: event } = await supabase.from("events").select("*").eq("slug", eventSlug).maybeSingle();
  if (!event) notFound();

  const [{ data: registration }, { data: saved }, { count: registeredCount }] = await Promise.all([
    supabase.from("event_registrations").select("id, status").eq("event_id", event.id).eq("student_id", user.profile.id).maybeSingle(),
    supabase.from("saved_events").select("id").eq("event_id", event.id).eq("student_id", user.profile.id).maybeSingle(),
    supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "registered"),
  ]);

  const canRegister =
    event.status === "registration_open" &&
    (!event.capacity || (registeredCount ?? 0) < event.capacity || true); // waitlist still allowed when full

  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: APP_TIMEZONE_FALLBACK,
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title={event.title} description={event.short_description ?? undefined} actions={<StatusBadge status={event.status} />} />

      <div className="mb-6 space-y-1 text-sm text-muted-foreground">
        <p>{formatter.format(new Date(event.starts_at))}</p>
        {event.location ? <p>{event.location}</p> : null}
        {event.capacity ? <p>{registeredCount ?? 0} / {event.capacity} registered</p> : null}
      </div>

      <EventActions
        eventId={event.id}
        eventSlug={event.slug}
        canRegister={canRegister}
        registration={registration ?? null}
        isSaved={Boolean(saved)}
      />

      {event.full_description ? (
        <div className="mt-6">
          <RichText content={event.full_description} />
        </div>
      ) : null}

      {event.rules || event.required_materials || event.prizes ? (
        <div className="mt-6 space-y-3 rounded-lg border border-border p-4 text-sm">
          {event.rules ? <p><span className="font-medium text-foreground">Rules: </span>{event.rules}</p> : null}
          {event.required_materials ? <p><span className="font-medium text-foreground">Required materials: </span>{event.required_materials}</p> : null}
          {event.prizes ? <p><span className="font-medium text-foreground">Prizes: </span>{event.prizes}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
