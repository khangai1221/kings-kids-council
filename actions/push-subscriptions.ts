"use server";

import { assertCurrentUser } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function registerPushToken(input: {
  fcmToken: string;
  deviceLabel?: string;
  browser?: string;
}): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();

    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: `push_token_register:${user.profile.id}`,
      p_window_seconds: 3600,
      p_max_requests: 20,
    });
    if (allowed === false) throw new Error("Too many registration attempts. Please try again later.");

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.profile.id,
        fcm_token: input.fcmToken,
        device_label: input.deviceLabel ?? null,
        browser: input.browser ?? null,
        enabled: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "fcm_token" },
    );
    if (error) throw error;
    return undefined;
  });
}

export async function removePushToken(fcmToken: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("fcm_token", fcmToken)
      .eq("user_id", user.profile.id);
    if (error) throw error;
    return undefined;
  });
}
