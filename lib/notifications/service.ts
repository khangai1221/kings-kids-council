import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFirebaseAdminMessaging } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/client";
import type { NotificationType } from "@/lib/constants";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * The single entry point for creating a notification: writes the in-app row,
 * checks preferences, sends an FCM push when enabled, records delivery
 * status, and removes invalid tokens. Uses the service-role client
 * deliberately — notification fan-out is a cross-cutting system concern
 * (e.g. an event-registration cancellation can trigger a notification to a
 * *different* student who gets promoted off the waitlist), and the
 * create_notification()/RLS design already authorizes service-role calls
 * for exactly this reason.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("in_app_enabled, push_enabled")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (preferences && !preferences.in_app_enabled) return;

  const { data: notificationId, error } = await supabase.rpc("create_notification", {
    p_user_id: params.userId,
    p_type: params.type,
    p_title: params.title,
    p_message: params.message,
    p_link: params.link ?? null,
    p_related_entity_type: params.relatedEntityType ?? null,
    p_related_entity_id: params.relatedEntityId ?? null,
  });

  if (error || !notificationId) {
    console.error("Failed to create notification", error);
    return;
  }

  if (!preferences || preferences.push_enabled) {
    await dispatchPush(params.userId, notificationId, params);
    await dispatchEmail(params.userId, params);
  } else {
    await supabase.rpc("mark_notification_delivery", { p_id: notificationId, p_status: "skipped" });
  }
}

/** Mirrors push delivery: fires whenever push is enabled, using the same on/off switch. */
async function dispatchEmail(userId: string, params: CreateNotificationParams): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.school_email) return;

  await sendEmail({
    to: profile.school_email,
    subject: params.title,
    title: params.title,
    body: params.message,
    link: params.link,
  });
}

async function dispatchPush(userId: string, notificationId: string, params: CreateNotificationParams): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const messaging = getFirebaseAdminMessaging();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, fcm_token")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (!messaging || !subscriptions || subscriptions.length === 0) {
    await supabase.rpc("mark_notification_delivery", { p_id: notificationId, p_status: "skipped" });
    return;
  }

  let anySuccess = false;
  for (const subscription of subscriptions) {
    try {
      await messaging.send({
        token: subscription.fcm_token,
        notification: { title: params.title, body: params.message },
        data: { link: params.link ?? "/notifications" },
        webpush: { fcmOptions: { link: params.link ?? "/notifications" } },
      });
      anySuccess = true;
      await supabase.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", subscription.id);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      } else {
        console.error("FCM send failed", error);
      }
    }
  }

  await supabase.rpc("mark_notification_delivery", {
    p_id: notificationId,
    p_status: anySuccess ? "sent" : "failed",
  });
}
