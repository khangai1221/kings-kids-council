"use server";

import { assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/service";

export async function broadcastNotification(input: {
  title: string;
  message: string;
  link?: string;
  audience: "all" | "grade";
  gradeLevelId?: string;
}): Promise<ActionResult<{ recipientCount: number }>> {
  return runAction(async () => {
    await assertCapability("notifications.manage");
    const supabase = createSupabaseServerClient();

    let query = supabase.from("profiles").select("id").eq("account_status", "active");
    if (input.audience === "grade" && input.gradeLevelId) query = query.eq("grade_level_id", input.gradeLevelId);
    const { data: recipients } = await query.limit(1000);

    for (const recipient of recipients ?? []) {
      await createNotification({
        userId: recipient.id,
        type: "general",
        title: input.title,
        message: input.message,
        link: input.link,
      });
    }

    await recordAuditEvent({ action: "notification.broadcast", resourceType: "notification", afterState: { title: input.title, audience: input.audience, count: recipients?.length ?? 0 } });
    return { recipientCount: recipients?.length ?? 0 };
  });
}
