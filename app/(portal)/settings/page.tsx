import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { PushNotificationToggle } from "@/components/settings/push-notification-toggle";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.profile.id)
    .maybeSingle();

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Settings" description="Notification and display preferences." />

      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent><ThemeToggle /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notification preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <NotificationPreferencesForm
            defaultInAppEnabled={preferences?.in_app_enabled ?? true}
            defaultPushEnabled={preferences?.push_enabled ?? true}
          />
          <div className="border-t border-border pt-4">
            <PushNotificationToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
