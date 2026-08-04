import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings/service";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UrgentAnnouncementBanner } from "@/components/layout/urgent-announcement-banner";
import { STUDENT_NAV_ITEMS, MOBILE_PRIMARY_NAV, STUDENT_QUICK_ACTIONS } from "@/lib/nav-config";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const [settings, supabase] = [await getSiteSettings(), createSupabaseServerClient()];

  const [{ count }, { data: urgentAnnouncements }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.profile.id)
      .eq("is_read", false),
    supabase
      .from("announcements")
      .select("id, slug, title, related_campaign_id, related_event_id")
      .eq("status", "published")
      .eq("urgent", true)
      .order("publish_at", { ascending: false })
      .limit(3),
  ]);

  return (
    <DashboardShell
      navItems={STUDENT_NAV_ITEMS}
      mobileNavItems={MOBILE_PRIMARY_NAV}
      quickActions={STUDENT_QUICK_ACTIONS}
      portalName={settings.portal_name}
      logoUrl={settings.portal_logo_url}
      homeHref="/dashboard"
      userId={user.profile.id}
      initialUnreadCount={count ?? 0}
    >
      <UrgentAnnouncementBanner announcements={urgentAnnouncements ?? []} />
      {children}
    </DashboardShell>
  );
}
