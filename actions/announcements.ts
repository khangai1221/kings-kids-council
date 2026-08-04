"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser, assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/service";
import type { AnnouncementAudience } from "@/lib/constants";

export async function markAnnouncementRead(announcementId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    await supabase.from("announcement_reads").upsert(
      { announcement_id: announcementId, student_id: user.profile.id },
      { onConflict: "announcement_id,student_id" },
    );
    return undefined;
  });
}

export async function createAnnouncement(input: {
  title: string;
  summary?: string;
  content?: string;
  audience: AnnouncementAudience;
  eligibleGradeLevelIds?: string[];
  pinned: boolean;
  urgent: boolean;
  publishAt?: string;
  expiresAt?: string;
  status: "draft" | "scheduled" | "published";
}): Promise<ActionResult<{ announcementId: string }>> {
  return runAction(async () => {
    await assertCapability("announcements.manage");
    const supabase = createSupabaseServerClient();
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: announcement, error } = await supabase
      .from("announcements")
      .insert({
        title: input.title,
        slug,
        summary: input.summary || null,
        content: input.content || null,
        audience: input.audience,
        eligible_grade_level_ids: input.eligibleGradeLevelIds?.length ? input.eligibleGradeLevelIds : null,
        pinned: input.pinned,
        urgent: input.urgent,
        publish_at: input.publishAt || new Date().toISOString(),
        expires_at: input.expiresAt || null,
        status: input.status,
      })
      .select("id")
      .single();
    if (error) throw error;

    await recordAuditEvent({ action: "announcement.created", resourceType: "announcement", resourceId: announcement.id });

    if (input.status === "published" && input.urgent) {
      let query = supabase.from("profiles").select("id").eq("account_status", "active");
      if (input.audience === "selected_grades" && input.eligibleGradeLevelIds?.length) {
        query = query.in("grade_level_id", input.eligibleGradeLevelIds);
      }
      const { data: students } = await query.limit(1000);
      for (const student of students ?? []) {
        await createNotification({
          userId: student.id,
          type: "announcement_urgent",
          title: "Urgent announcement",
          message: input.title,
          link: `/announcements/${slug}`,
        });
      }
    }

    revalidatePath("/admin/announcements");
    return { announcementId: announcement.id };
  });
}

export async function updateAnnouncementStatus(announcementId: string, status: "draft" | "scheduled" | "published" | "expired" | "archived"): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("announcements.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("announcements").update({ status }).eq("id", announcementId);
    if (error) throw error;
    revalidatePath("/admin/announcements");
    return undefined;
  });
}
