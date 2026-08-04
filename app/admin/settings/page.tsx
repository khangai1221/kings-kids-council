import { requireCapability } from "@/lib/auth/require";
import { getSiteSettings } from "@/lib/settings/service";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/app/admin/settings/settings-form";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireCapability("settings.manage");
  const settings = await getSiteSettings();

  return (
    <div>
      <PageHeader title="Site settings" description="Portal-wide configuration." />
      <SettingsForm settings={settings} />
    </div>
  );
}
