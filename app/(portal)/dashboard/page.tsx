import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CheckSquare, ClipboardList, FileText, CalendarDays, Megaphone, Lightbulb, ArrowRight } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { GreetingCard } from "@/components/dashboard/greeting-card";
import { QuickAccessGrid } from "@/components/dashboard/quick-access-grid";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const supabase = createSupabaseServerClient();

  const [poll, survey, submission, events, announcements, gradeLevel, schoolClass] = await Promise.all([
    supabase.from("polls").select("id, title, slug, closes_at").eq("status", "open").order("closes_at").limit(1).maybeSingle(),
    supabase.from("surveys").select("id, title, slug, closes_at").eq("status", "open").order("closes_at").limit(1).maybeSingle(),
    supabase
      .from("application_submissions")
      .select("id, status, campaign_id, position_id, application_campaigns(title), application_positions(title)")
      .eq("student_id", user.profile.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, title, slug, starts_at, location")
      .in("status", ["registration_open", "published"])
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(3),
    supabase
      .from("announcements")
      .select("id, title, slug, summary, urgent, publish_at")
      .eq("status", "published")
      .order("publish_at", { ascending: false })
      .limit(3),
    user.profile.grade_level_id
      ? supabase.from("grade_levels").select("label").eq("id", user.profile.grade_level_id).maybeSingle()
      : Promise.resolve({ data: null }),
    user.profile.school_class_id
      ? supabase.from("school_classes").select("label").eq("id", user.profile.school_class_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const firstName = user.profile.display_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <GreetingCard
        firstName={firstName}
        avatarUrl={user.profile.avatar_url}
        gradeLabel={gradeLevel.data?.label}
        classLabel={schoolClass.data?.label}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Quick Access</h2>
        <QuickAccessGrid />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="gap-3 py-4">
          <CardContent className="space-y-2.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><CheckSquare className="size-4 text-primary" /> Poll</p>
            {poll.data ? (
              <>
                <p className="font-medium text-foreground">{poll.data.title}</p>
                {poll.data.closes_at ? (
                  <p className="text-xs text-muted-foreground">
                    Closes {formatDistanceToNow(new Date(poll.data.closes_at), { addSuffix: true })}
                  </p>
                ) : null}
                <Button asChild size="sm"><Link href={`/polls/${poll.data.slug}`}>Vote now</Link></Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active polls right now.</p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardContent className="space-y-2.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardList className="size-4 text-primary" /> Survey</p>
            {survey.data ? (
              <>
                <p className="font-medium text-foreground">{survey.data.title}</p>
                <Button asChild size="sm" variant="outline"><Link href={`/surveys/${survey.data.slug}`}>Respond</Link></Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No open surveys right now.</p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardContent className="space-y-2.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><FileText className="size-4 text-primary" /> Your application</p>
            {submission.data ? (
              <>
                <p className="font-medium text-foreground">
                  {(submission.data as unknown as { application_positions: { title: string } }).application_positions?.title}
                </p>
                <StatusBadge status={submission.data.status} />
                <div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/applications/submissions/${submission.data.id}`}>View application</Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">You have not started an application yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <CalendarDays className="size-5 text-primary" /> Upcoming events
          </h2>
          <Link href="/events" className="flex items-center gap-1 text-sm text-primary">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {events.data && events.data.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.data.map((event) => {
              const startsAt = new Date(event.starts_at);
              return (
                <Card key={event.id}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex w-12 shrink-0 flex-col items-center rounded-md bg-primary py-1.5 text-primary-foreground">
                      <span className="text-[10px] font-semibold uppercase leading-none">
                        {startsAt.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="text-lg font-bold leading-tight">{startsAt.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {startsAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                      <Button asChild size="sm" variant="link" className="mt-1 h-auto p-0">
                        <Link href={`/events/${event.slug}`}>View details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No upcoming events match these filters." />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Megaphone className="size-5 text-primary" /> Latest announcements
          </h2>
          <Link href="/announcements" className="flex items-center gap-1 text-sm text-primary">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {announcements.data && announcements.data.length > 0 ? (
          <div className="space-y-2">
            {announcements.data.map((announcement) => (
              <Link
                key={announcement.id}
                href={`/announcements/${announcement.slug}`}
                className="block rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
              >
                <p className="font-medium text-foreground">{announcement.title}</p>
                {announcement.summary ? <p className="text-sm text-muted-foreground">{announcement.summary}</p> : null}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No announcements yet." />
        )}
      </section>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Lightbulb className="size-8 text-accent" />
            <div>
              <p className="font-medium text-foreground">Have an idea for the council?</p>
              <p className="text-sm text-muted-foreground">Share a suggestion — identified or anonymous.</p>
            </div>
          </div>
          <Button asChild><Link href="/suggestions/new">Submit a suggestion</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
