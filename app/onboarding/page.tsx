import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireCurrentUser();
  if (user.profile.onboarding_status === "completed") redirect(ROUTES.dashboard);

  const supabase = createSupabaseServerClient();
  const [{ data: gradeLevels }, { data: schoolClasses }] = await Promise.all([
    supabase.from("grade_levels").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("school_classes").select("*").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <main id="main-content" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Welcome — let&apos;s set up your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">A few details before you can access the portal.</p>
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
