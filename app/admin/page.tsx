import Link from "next/link";
import { redirect } from "next/navigation";
import { subDays, startOfDay, format } from "date-fns";
import { Users, CalendarDays, CheckSquare, Trophy, ClipboardCheck, Lightbulb, ArrowRight, CircleCheck } from "lucide-react";
import { requireStaffAccess } from "@/lib/auth/require";
import { isAdminTier } from "@/lib/permissions/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityLineChart, type ActivitySeriesPoint } from "@/components/admin/dashboard/activity-line-chart";
import { QuickActionsGrid } from "@/components/admin/dashboard/quick-actions-grid";
import { RecentList } from "@/components/admin/dashboard/recent-list";

export const metadata = { title: "Admin Dashboard" };

const ACTIVITY_WINDOW_DAYS = 14;

/** Buckets a list of ISO timestamps into per-day counts across the trailing window, keyed by "MMM d". */
function bucketByDay(timestamps: string[], windowDays: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = windowDays - 1; i >= 0; i--) {
    counts.set(format(subDays(startOfDay(new Date()), i), "MMM d"), 0);
  }
  for (const ts of timestamps) {
    const key = format(startOfDay(new Date(ts)), "MMM d");
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>;
}

export default async function AdminDashboardPage() {
  const user = await requireStaffAccess();
  if (!isAdminTier(user.effectiveRoles)) redirect("/admin/reviews");

  const supabase = createSupabaseServerClient();
  const windowStart = subDays(new Date(), ACTIVITY_WINDOW_DAYS).toISOString();

  const { data: competitionCategory } = await supabase.from("event_categories").select("id").eq("key", "competition").maybeSingle();

  const [
    { count: activeStudents },
    { count: activePolls },
    { count: upcomingEvents },
    { count: openCompetitions },
    { count: unreadSuggestions },
    { count: pendingReviews },
    { data: recentAudit },
    { data: recentAnnouncements },
    { data: recentPolls },
    { data: pollVotes },
    { data: recentCompetitions },
    { data: competitionRegistrations },
    { data: applicationSubmittedAt },
    { data: surveySubmittedAt },
    { data: pollVotedAt },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "active"),
    supabase.from("polls").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("events").select("id", { count: "exact", head: true }).in("status", ["registration_open", "published"]).gte("starts_at", new Date().toISOString()),
    competitionCategory
      ? supabase.from("events").select("id", { count: "exact", head: true }).eq("category_id", competitionCategory.id).in("status", ["registration_open", "published"])
      : Promise.resolve({ count: 0 }),
    supabase.from("suggestions").select("id", { count: "exact", head: true }).eq("status", "received"),
    supabase.from("review_assignments").select("id", { count: "exact", head: true }).in("status", ["assigned", "in_progress"]),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(6),
    supabase.from("announcements").select("id, title, slug, status, publish_at").order("publish_at", { ascending: false }).limit(5),
    supabase.from("polls").select("id, title, status").order("created_at", { ascending: false }).limit(5),
    supabase.from("poll_votes").select("poll_id"),
    competitionCategory
      ? supabase.from("events").select("id, title, status, registration_closes_at").eq("category_id", competitionCategory.id).order("starts_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    supabase.from("event_registrations").select("event_id").eq("status", "registered"),
    supabase.from("application_submissions").select("submitted_at").not("submitted_at", "is", null).gte("submitted_at", windowStart),
    supabase.from("survey_responses").select("submitted_at").gte("submitted_at", windowStart),
    supabase.from("poll_votes").select("voted_at").gte("voted_at", windowStart),
  ]);

  const applicationsByDay = bucketByDay((applicationSubmittedAt ?? []).map((r) => r.submitted_at!), ACTIVITY_WINDOW_DAYS);
  const surveysByDay = bucketByDay((surveySubmittedAt ?? []).map((r) => r.submitted_at), ACTIVITY_WINDOW_DAYS);
  const pollsByDay = bucketByDay((pollVotedAt ?? []).map((r) => r.voted_at), ACTIVITY_WINDOW_DAYS);
  const activityData: ActivitySeriesPoint[] = [...applicationsByDay.keys()].map((date) => ({
    date,
    applications: applicationsByDay.get(date) ?? 0,
    surveys: surveysByDay.get(date) ?? 0,
    polls: pollsByDay.get(date) ?? 0,
  }));

  const votesByPoll = new Map<string, number>();
  for (const vote of pollVotes ?? []) votesByPoll.set(vote.poll_id, (votesByPoll.get(vote.poll_id) ?? 0) + 1);

  const registrationsByEvent = new Map<string, number>();
  for (const registration of competitionRegistrations ?? []) {
    registrationsByEvent.set(registration.event_id, (registrationsByEvent.get(registration.event_id) ?? 0) + 1);
  }

  const attention = [
    {
      show: (pendingReviews ?? 0) > 0,
      href: "/admin/reviews",
      icon: ClipboardCheck,
      label: "Applications awaiting review",
      value: pendingReviews ?? 0,
    },
    {
      show: (unreadSuggestions ?? 0) > 0,
      href: "/admin/suggestions",
      icon: Lightbulb,
      label: "New suggestions to triage",
      value: unreadSuggestions ?? 0,
    },
  ].filter((item) => item.show);

  return (
    <div className="space-y-8">
      <PageHeader title="Admin dashboard" description="What needs your attention, and how the council is doing this fortnight." />

      {/* 1 — Needs attention */}
      {attention.length > 0 ? (
        <section>
          <SectionTitle>Needs attention</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {attention.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-4 rounded-xl border border-warning/30 bg-warning/5 p-4 transition-colors hover:bg-warning/10"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{item.value}</p>
                  <p className="truncate text-sm text-muted-foreground">{item.label}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
          <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
          All caught up — no reviews or suggestions waiting.
        </p>
      )}

      {/* 2 — Overview numbers */}
      <section>
        <SectionTitle>Overview</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Active students" value={activeStudents ?? 0} icon={Users} />
          <StatCard label="Open polls" value={activePolls ?? 0} icon={CheckSquare} />
          <StatCard label="Upcoming events" value={upcomingEvents ?? 0} icon={CalendarDays} />
          <StatCard label="Open competitions" value={openCompetitions ?? 0} icon={Trophy} />
        </div>
      </section>

      {/* 3 — Quick actions */}
      <section>
        <SectionTitle>Quick actions</SectionTitle>
        <QuickActionsGrid />
      </section>

      {/* 4 — Activity */}
      <section>
        <SectionTitle>Participation · last 14 days</SectionTitle>
        <Card>
          <CardContent className="p-4">
            <ActivityLineChart
              data={activityData}
              series={[
                { key: "applications", label: "Applications", color: "var(--color-primary)" },
                { key: "surveys", label: "Surveys", color: "var(--color-accent)" },
                { key: "polls", label: "Poll votes", color: "var(--color-info)" },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      {/* 5 — Recent */}
      <section>
        <SectionTitle>Recent</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">Council updates</h3>
            <RecentList
              emptyLabel="No announcements yet."
              items={(recentAnnouncements ?? []).map((a) => ({
                id: a.id,
                title: a.title,
                status: a.status,
                href: `/admin/announcements`,
                meta: a.publish_at ? new Date(a.publish_at).toLocaleDateString() : undefined,
              }))}
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">Polls</h3>
            <RecentList
              emptyLabel="No polls yet."
              items={(recentPolls ?? []).map((poll) => ({
                id: poll.id,
                title: poll.title,
                status: poll.status,
                href: `/admin/polls/${poll.id}`,
                meta: `${votesByPoll.get(poll.id) ?? 0} vote${(votesByPoll.get(poll.id) ?? 0) === 1 ? "" : "s"}`,
              }))}
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">Competitions</h3>
            <RecentList
              emptyLabel="No competitions yet."
              items={(recentCompetitions ?? []).map((competition) => ({
                id: competition.id,
                title: competition.title,
                status: competition.status,
                href: `/admin/competitions/${competition.id}`,
                meta: [
                  `${registrationsByEvent.get(competition.id) ?? 0} registered`,
                  competition.registration_closes_at
                    ? `closes ${new Date(competition.registration_closes_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            />
          </div>
        </div>
      </section>

      {/* 6 — Audit trail */}
      <section>
        <SectionTitle>Recent admin actions</SectionTitle>
        {recentAudit && recentAudit.length > 0 ? (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {recentAudit.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="capitalize text-foreground">{entry.action.replace(/[._]/g, " ")}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">No recent administrative actions.</p>
        )}
      </section>
    </div>
  );
}
