import { requireStaffAccess } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings/service";
import { can } from "@/lib/permissions/capabilities";
import { isAdminTier } from "@/lib/permissions/roles";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { ADMIN_NAV_ITEMS, ADMIN_QUICK_ACTIONS } from "@/lib/nav-config";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffAccess();
  const [settings, supabase] = [await getSiteSettings(), createSupabaseServerClient()];

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.profile.id)
    .eq("is_read", false);

  const isReviewerOnly = !isAdminTier(user.effectiveRoles) && user.effectiveRoles.includes("reviewer");

  const visibleNavItems = ADMIN_NAV_ITEMS.filter((item) => {
    if (isReviewerOnly) return item.href === "/admin/reviews";
    return !item.capability || can(user.effectiveRoles, user.capabilities, item.capability);
  });

  const isTeacherAdvisorOrSuper =
    user.effectiveRoles.includes("teacher_advisor") || user.effectiveRoles.includes("super_admin");

  return (
    <DashboardShell
      navItems={visibleNavItems}
      quickActions={isReviewerOnly ? undefined : ADMIN_QUICK_ACTIONS}
      portalName={`${settings.portal_name} Admin`}
      logoUrl={settings.portal_logo_url}
      homeHref={isReviewerOnly ? "/admin/reviews" : "/admin"}
      userId={user.profile.id}
      initialUnreadCount={count ?? 0}
      badge={
        <Badge
          variant="outline"
          className={
            isTeacherAdvisorOrSuper
              ? "border-transparent bg-primary/10 text-primary"
              : "border-transparent bg-secondary text-secondary-foreground"
          }
        >
          {isReviewerOnly
            ? "Reviewer"
            : user.profile.role === "super_admin"
              ? "Super Admin"
              : user.profile.role === "teacher_advisor"
                ? "Teacher Advisor"
                : "Admin"}
        </Badge>
      }
    >
      {children}
    </DashboardShell>
  );
}
