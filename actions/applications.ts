"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser, assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/service";
import { hydrateFormVersion } from "@/lib/forms/hydrate";
import { validateAnswers } from "@/lib/forms/validate-answers";
import { uploadFile } from "@/lib/storage/upload";
import { computeCompletionPercent } from "@/components/forms/dynamic-form";
import type { AnswersByQuestionKey, FileAnswerValue } from "@/lib/forms/types";
import type { ApplicationStatus } from "@/lib/constants";

export async function startApplication(campaignId: string, positionId: string): Promise<ActionResult<{ submissionId: string }>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("application_submissions")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("position_id", positionId)
      .eq("student_id", user.profile.id)
      .neq("status", "withdrawn")
      .maybeSingle();
    if (existing) return { submissionId: existing.id };

    const { data: campaign } = await supabase.from("application_campaigns").select("*").eq("id", campaignId).maybeSingle();
    if (!campaign) throw new Error("Campaign not found.");
    if (campaign.status !== "open") throw new Error("This campaign is not currently accepting applications.");
    if (!campaign.form_version_id) throw new Error("This campaign has no application form configured yet.");

    const { data: submission, error } = await supabase
      .from("application_submissions")
      .insert({
        campaign_id: campaignId,
        position_id: positionId,
        student_id: user.profile.id,
        form_version_id: campaign.form_version_id,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;

    return { submissionId: submission.id };
  });
}

export async function saveApplicationAnswers(
  submissionId: string,
  answers: AnswersByQuestionKey,
): Promise<ActionResult<{ progressPercent: number }>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();

    const { data: submission } = await supabase
      .from("application_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();
    if (!submission || submission.student_id !== user.profile.id) throw new Error("Application not found.");
    if (submission.status !== "draft") throw new Error("This application can no longer be edited.");

    const hydrated = await hydrateFormVersion(submission.form_version_id);
    if (!hydrated) throw new Error("Form is unavailable.");

    for (const question of hydrated.questions) {
      const value = answers[question.key];
      if (value === undefined) continue;
      const isFile = value !== null && typeof value === "object" && !Array.isArray(value);
      await supabase.from("application_answers").upsert(
        {
          submission_id: submissionId,
          question_id: question.id,
          value_json: isFile ? { filename: (value as FileAnswerValue).filename } : (value as never),
          file_record_id: isFile ? (value as FileAnswerValue).fileRecordId : null,
        },
        { onConflict: "submission_id,question_id" },
      );
    }

    const progressPercent = computeCompletionPercent(
      hydrated.questions,
      answers,
      user.profile.grade_level_id,
      submission.position_id,
    );
    await supabase.from("application_submissions").update({ progress_percent: progressPercent }).eq("id", submissionId);

    return { progressPercent };
  });
}

export async function submitApplication(submissionId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();

    const { data: submission } = await supabase.from("application_submissions").select("*").eq("id", submissionId).maybeSingle();
    if (!submission || submission.student_id !== user.profile.id) throw new Error("Application not found.");
    if (submission.status !== "draft") throw new Error("This application has already been submitted.");

    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: `application_submit:${user.profile.id}`,
      p_window_seconds: 3600,
      p_max_requests: 20,
    });
    if (allowed === false) throw new Error("Too many submission attempts. Please try again later.");

    const hydrated = await hydrateFormVersion(submission.form_version_id);
    if (!hydrated) throw new Error("Form is unavailable.");

    const { data: answerRows } = await supabase
      .from("application_answers")
      .select("question_id, value_json, file_record_id")
      .eq("submission_id", submissionId);

    const questionKeyById = new Map(hydrated.questions.map((q) => [q.id, q.key]));
    const answers: AnswersByQuestionKey = {};
    for (const row of answerRows ?? []) {
      const key = questionKeyById.get(row.question_id);
      if (!key) continue;
      answers[key] = row.file_record_id
        ? { fileRecordId: row.file_record_id, filename: (row.value_json as { filename?: string })?.filename ?? "file" }
        : (row.value_json as never);
    }

    const issues = validateAnswers({
      questions: hydrated.questions,
      answers,
      studentGradeLevelId: user.profile.grade_level_id,
      positionId: submission.position_id,
    });
    if (issues.length > 0) throw new Error(issues[0].message);

    const { error } = await supabase
      .from("application_submissions")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), progress_percent: 100 })
      .eq("id", submissionId);
    if (error) throw error;

    await createNotification({
      userId: user.profile.id,
      type: "application_submitted",
      title: "Application submitted",
      message: "Your application has been submitted and is awaiting review.",
      link: `/applications/submissions/${submissionId}`,
      relatedEntityType: "application_submission",
      relatedEntityId: submissionId,
    });

    revalidatePath(`/applications/submissions/${submissionId}`);
    return undefined;
  });
}

export async function withdrawApplication(submissionId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    const { data: submission } = await supabase.from("application_submissions").select("student_id").eq("id", submissionId).maybeSingle();
    if (!submission || submission.student_id !== user.profile.id) throw new Error("Application not found.");

    const { error } = await supabase
      .from("application_submissions")
      .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() })
      .eq("id", submissionId);
    if (error) throw error;

    revalidatePath(`/applications/submissions/${submissionId}`);
    return undefined;
  });
}

export async function uploadApplicationFile(formData: FormData): Promise<ActionResult<FileAnswerValue>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("No file provided.");
    const result = await uploadFile({
      bucket: "application-files",
      purpose: "application_answer",
      file,
      pathPrefix: user.profile.id,
    });
    return { fileRecordId: result.fileRecordId, filename: result.filename };
  });
}

export async function returnApplicationForCorrection(
  submissionId: string,
  reason: string,
): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("applications.manage");
    const supabase = createSupabaseServerClient();
    const { data: submission } = await supabase.from("application_submissions").select("student_id").eq("id", submissionId).maybeSingle();
    if (!submission) throw new Error("Application not found.");

    const { error } = await supabase
      .from("application_submissions")
      .update({ status: "draft", returned_for_correction_reason: reason })
      .eq("id", submissionId);
    if (error) throw error;

    await createNotification({
      userId: submission.student_id,
      type: "application_status_changed",
      title: "Application returned for correction",
      message: reason,
      link: `/applications/submissions/${submissionId}`,
      relatedEntityType: "application_submission",
      relatedEntityId: submissionId,
    });
    await recordAuditEvent({ action: "application.returned_for_correction", resourceType: "application_submission", resourceId: submissionId, reason });

    revalidatePath("/admin/applications");
    return undefined;
  });
}

export async function updateApplicationStatus(
  submissionId: string,
  status: ApplicationStatus,
): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("applications.manage");
    const supabase = createSupabaseServerClient();
    const { data: submission } = await supabase.from("application_submissions").select("student_id, status").eq("id", submissionId).maybeSingle();
    if (!submission) throw new Error("Application not found.");

    const { error } = await supabase
      .from("application_submissions")
      .update({ status, decision_at: ["accepted", "waitlisted", "not_selected"].includes(status) ? new Date().toISOString() : null })
      .eq("id", submissionId);
    if (error) throw error;

    await createNotification({
      userId: submission.student_id,
      type: "application_status_changed",
      title: "Application status updated",
      message: `Your application status changed to "${status.replace("_", " ")}".`,
      link: `/applications/submissions/${submissionId}`,
      relatedEntityType: "application_submission",
      relatedEntityId: submissionId,
    });

    revalidatePath("/admin/applications");
    return undefined;
  });
}
