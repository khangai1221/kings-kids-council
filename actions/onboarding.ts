"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCurrentUser } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/onboarding";
import { ROUTES } from "@/lib/constants";

export async function completeOnboarding(input: OnboardingInput): Promise<ActionResult<undefined>> {
  const result = await runAction(async () => {
    const user = await assertCurrentUser();
    const data = onboardingSchema.parse(input);

    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.displayName,
        grade_level_id: data.gradeLevelId,
        school_class_id: data.schoolClassId || null,
        graduation_year: data.graduationYear ?? null,
        notification_in_app_default: data.notificationInAppEnabled,
        notification_push_default: data.notificationPushEnabled,
        accepted_rules_at: new Date().toISOString(),
        accepted_privacy_at: new Date().toISOString(),
        onboarding_status: "completed",
      })
      .eq("id", user.profile.id);

    if (error) throw error;

    await supabase
      .from("notification_preferences")
      .update({ in_app_enabled: data.notificationInAppEnabled, push_enabled: data.notificationPushEnabled })
      .eq("user_id", user.profile.id);

    revalidatePath("/", "layout");
    return undefined;
  });

  if (result.success) redirect(ROUTES.dashboard);
  return result;
}
