"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validation/profile";

export async function updateProfile(input: unknown): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const data = updateProfileSchema.parse(input);
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.displayName,
        grade_level_id: data.gradeLevelId || null,
        school_class_id: data.schoolClassId || null,
        graduation_year: data.graduationYear ?? null,
      })
      .eq("id", user.profile.id);
    if (error) throw error;

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return undefined;
  });
}

export async function updateNotificationPreferences(input: {
  inAppEnabled: boolean;
  pushEnabled: boolean;
}): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("notification_preferences")
      .update({ in_app_enabled: input.inAppEnabled, push_enabled: input.pushEnabled })
      .eq("user_id", user.profile.id);
    if (error) throw error;
    revalidatePath("/settings");
    return undefined;
  });
}
