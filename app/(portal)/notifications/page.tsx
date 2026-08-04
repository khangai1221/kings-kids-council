import { Bell } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationItem } from "@/app/(portal)/notifications/notification-item";
import { MarkAllReadButton } from "@/app/(portal)/notifications/mark-all-read-button";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const hasUnread = (notifications ?? []).some((n) => !n.is_read);

  return (
    <div className="max-w-xl">
      <PageHeader title="Notifications" actions={hasUnread ? <MarkAllReadButton /> : undefined} />
      {!notifications || notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You have no notifications yet." />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
}
