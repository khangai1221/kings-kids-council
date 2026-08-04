"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function markNotificationRead(notificationId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.profile.id);
    if (error) throw error;
    revalidatePath("/notifications");
    return undefined;
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.profile.id)
      .eq("is_read", false);
    if (error) throw error;
    revalidatePath("/notifications");
    return undefined;
  });
}
