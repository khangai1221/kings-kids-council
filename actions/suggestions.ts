"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser, assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/service";
import { uploadFile } from "@/lib/storage/upload";
import { submitSuggestionSchema, type SubmitSuggestionInput } from "@/lib/validation/suggestion";
import type { SuggestionStatus } from "@/lib/constants";

export async function submitSuggestion(
  input: SubmitSuggestionInput,
  attachment?: FormData,
): Promise<ActionResult<{ suggestionId: string }>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const data = submitSuggestionSchema.parse(input);
    const supabase = createSupabaseServerClient();

    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: `suggestion_submit:${user.profile.id}`,
      p_window_seconds: 3600,
      p_max_requests: 10,
    });
    if (allowed === false) throw new Error("You've submitted several suggestions recently. Please try again later.");

    let attachmentFileId: string | null = null;
    const file = attachment?.get("file");
    if (file instanceof File && file.size > 0) {
      const result = await uploadFile({ bucket: "suggestion-files", purpose: "suggestion_attachment", file, pathPrefix: user.profile.id });
      attachmentFileId = result.fileRecordId;
    }

    const { data: suggestionId, error } = await supabase.rpc("submit_suggestion", {
      p_category_id: data.categoryId || null,
      p_subject: data.subject,
      p_message: data.message,
      p_proposed_solution: data.proposedSolution || null,
      p_attachment_file_id: attachmentFileId,
      p_identity_mode: data.identityMode,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/suggestions");
    return { suggestionId: suggestionId as string };
  });
}

export async function addSuggestionReply(suggestionId: string, message: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("suggestion_replies").insert({
      suggestion_id: suggestionId,
      author_type: "student",
      author_id: user.profile.id,
      message,
    });
    if (error) throw error;
    revalidatePath(`/suggestions/${suggestionId}`);
    return undefined;
  });
}

export async function adminReplyToSuggestion(suggestionId: string, message: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCapability("suggestions.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("suggestion_replies").insert({
      suggestion_id: suggestionId,
      author_type: "admin",
      author_id: user.profile.id,
      message,
    });
    if (error) throw error;

    const { data: suggestion } = await supabase.from("suggestions").select("student_id").eq("id", suggestionId).maybeSingle();
    if (suggestion?.student_id) {
      await createNotification({
        userId: suggestion.student_id,
        type: "suggestion_response_received",
        title: "Response to your suggestion",
        message,
        link: `/suggestions/${suggestionId}`,
      });
    }

    revalidatePath("/admin/suggestions");
    return undefined;
  });
}

export async function updateSuggestionStatus(suggestionId: string, status: SuggestionStatus): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("suggestions.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("suggestions").update({ status }).eq("id", suggestionId);
    if (error) throw error;
    revalidatePath("/admin/suggestions");
    return undefined;
  });
}

export async function revealSuggestionIdentity(
  suggestionId: string,
  reason: string,
): Promise<ActionResult<{ displayName: string | null; schoolEmail: string }>> {
  return runAction(async () => {
    await assertCapability("suggestions.manage_restricted");
    if (!reason.trim()) throw new Error("A reason is required to reveal an anonymous identity.");
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("reveal_suggestion_identity", { p_suggestion_id: suggestionId, p_reason: reason });
    if (error) throw new Error(error.message);
    const row = (data as { display_name: string | null; school_email: string }[])[0];
    if (!row) throw new Error("Identity not found.");
    return { displayName: row.display_name, schoolEmail: row.school_email };
  });
}

export async function assignSuggestion(suggestionId: string, assigneeId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("suggestions.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("suggestions").update({ assigned_to: assigneeId }).eq("id", suggestionId);
    if (error) throw error;
    await recordAuditEvent({ action: "suggestion.assigned", resourceType: "suggestion", resourceId: suggestionId });
    revalidatePath("/admin/suggestions");
    return undefined;
  });
}
