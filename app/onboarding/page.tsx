import Image from "next/image";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings/service";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireCurrentUser();
  if (user.profile.onboarding_status === "completed") redirect(ROUTES.dashboard);

  const supabase = createSupabaseServerClient();
  const [settings, { data: gradeLevels }, { data: schoolClasses }] = await Promise.all([
    getSiteSettings(),
    supabase.from("grade_levels").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("school_classes").select("*").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <main id="main-content" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-10 sm:px-6 sm:py-12">
      <div className="mb-6 flex items-center gap-3">
        <Image
          src={settings.portal_logo_url || "/icons/icon.svg"}
          alt=""
          width={36}
          height={36}
          className="rounded-lg"
        />
        <span className="text-sm font-semibold text-muted-foreground">{settings.portal_name}</span>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Step 2 of 2</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Set up your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Just a few details before you can access the portal.</p>
        <OnboardingForm
          schoolEmail={user.profile.school_email}
          defaultDisplayName={user.profile.display_name ?? ""}
          gradeLevels={gradeLevels ?? []}
          schoolClasses={schoolClasses ?? []}
        />
      </div>
    </main>
  );
}
