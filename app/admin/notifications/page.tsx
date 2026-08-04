import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { BroadcastForm } from "@/app/admin/notifications/broadcast-form";

export const metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  await requireCapability("notifications.manage");
  const supabase = createSupabaseServerClient();
  const { data: gradeLevels } = await supabase.from("grade_levels").select("*").order("sort_order");

  return (
    <div>
      <PageHeader title="Send notification" description="Broadcast an in-app and push notification to students." />
      <BroadcastForm gradeLevels={gradeLevels ?? []} />
    </div>
  );
}
