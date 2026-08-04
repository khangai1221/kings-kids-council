import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { EventFilters } from "@/app/(portal)/events/event-filters";

export const metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  await requireOnboardedUser();
  const { category } = await searchParams;
  const supabase = createSupabaseServerClient();

  const { data: categories } = await supabase.from("event_categories").select("*").order("sort_order");

  let query = supabase
    .from("events")
    .select("*")
    .not("status", "in", "(draft,archived)")
    .order("starts_at");
  if (category) query = query.eq("category_id", category);
  const { data: events } = await query;

  return (
    <div>
      <PageHeader title="Events" description="Council events, competitions, and school activities." />
      <EventFilters categories={categories ?? []} activeCategory={category} />

      {!events || events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming events match these filters." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.slug}`}>
              <Card className="h-full transition-colors hover:bg-secondary/40">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <StatusBadge status={event.status} />
                    {event.featured ? <span className="text-xs font-medium text-accent">Featured</span> : null}
                  </div>
                  <p className="font-semibold text-foreground">{event.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(event.starts_at).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  {event.short_description ? <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{event.short_description}</p> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
