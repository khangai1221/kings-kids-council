"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser, assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/service";
import type { AnswersByQuestionKey } from "@/lib/forms/types";
import type { Json } from "@/types/database";

export async function submitSurveyResponse(surveyId: string, answers: AnswersByQuestionKey): Promise<ActionResult<{ responseId: string }>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();

    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: `survey_submit:${user.profile.id}`,
      p_window_seconds: 3600,
      p_max_requests: 30,
    });
    if (allowed === false) throw new Error("Too many submission attempts. Please try again later.");

    const answersArray = Object.entries(answers).map(([key, value]) => ({ question_id: key, value }));
    // The RPC expects question_id (uuid) — map from key to id first.
    const { data: survey } = await supabase.from("surveys").select("form_version_id").eq("id", surveyId).maybeSingle();
    if (!survey?.form_version_id) throw new Error("Survey has no form configured.");
    const { data: questions } = await supabase.from("form_questions").select("id, key").eq("form_version_id", survey.form_version_id);
    const idByKey = new Map((questions ?? []).map((q) => [q.key, q.id]));

    const payload = answersArray
      .map((a) => ({ question_id: idByKey.get(a.question_id), value: a.value }))
      .filter((a) => a.question_id);

    const { data: responseId, error } = await supabase.rpc("submit_survey_response", {
      p_survey_id: surveyId,
      p_answers: payload as unknown as Json,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/surveys");
    return { responseId: responseId as string };
  });
}

export async function createSurvey(input: {
  title: string;
  description?: string;
  mode: "anonymous" | "identified" | "anonymous_with_participation_tracking";
  formVersionId: string;
  eligibleGradeLevelIds: string[];
  opensAt: string;
  closesAt: string;
}): Promise<ActionResult<{ surveyId: string }>> {
  return runAction(async () => {
    await assertCapability("surveys.manage");
    const supabase = createSupabaseServerClient();
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: survey, error } = await supabase
      .from("surveys")
      .insert({
        title: input.title,
        slug,
        description: input.description || null,
        mode: input.mode,
        form_version_id: input.formVersionId,
        eligible_grade_level_ids: input.eligibleGradeLevelIds,
        opens_at: input.opensAt,
        closes_at: input.closesAt,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/admin/surveys");
    return { surveyId: survey.id };
  });
}

export async function updateSurveyStatus(surveyId: string, status: "draft" | "scheduled" | "open" | "closed" | "archived"): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("surveys.manage");
    const supabase = createSupabaseServerClient();
    const { data: survey } = await supabase.from("surveys").select("title, eligible_grade_level_ids, slug").eq("id", surveyId).maybeSingle();
    const { error } = await supabase.from("surveys").update({ status }).eq("id", surveyId);
    if (error) throw error;

    if (status === "open" && survey) {
      let studentsQuery = supabase.from("profiles").select("id").eq("account_status", "active");
      if (survey.eligible_grade_level_ids?.length) {
        studentsQuery = studentsQuery.in("grade_level_id", survey.eligible_grade_level_ids);
      }
      const { data: students } = await studentsQuery.limit(500);
      for (const student of students ?? []) {
        await createNotification({
          userId: student.id,
          type: "survey_opened",
          title: "New survey available",
          message: `${survey.title} is now open.`,
          link: `/surveys/${survey.slug}`,
        });
      }
    }

    revalidatePath("/admin/surveys");
    return undefined;
  });
}
