import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HydratedFormVersion, HydratedQuestion } from "@/lib/forms/types";

/** Loads a form version's questions/options/conditions into renderer-ready shape. */
export async function hydrateFormVersion(formVersionId: string): Promise<HydratedFormVersion | null> {
  const supabase = createSupabaseServerClient();

  const { data: version } = await supabase
    .from("form_versions")
    .select("id, form_id")
    .eq("id", formVersionId)
    .maybeSingle();
  if (!version) return null;

  const { data: form } = await supabase.from("forms").select("title").eq("id", version.form_id).maybeSingle();

  const { data: questions } = await supabase
    .from("form_questions")
    .select("*")
    .eq("form_version_id", formVersionId)
    .order("position");

  if (!questions || questions.length === 0) {
    return { formVersionId, formTitle: form?.title ?? "", questions: [] };
  }

  const questionIds = questions.map((question) => question.id);
  const [{ data: options }, { data: conditions }] = await Promise.all([
    supabase.from("form_question_options").select("*").in("question_id", questionIds).order("position"),
    supabase.from("form_conditions").select("*").in("question_id", questionIds),
  ]);

  const hydrated: HydratedQuestion[] = questions.map((question) => ({
    ...question,
    options: (options ?? []).filter((option) => option.question_id === question.id),
    conditions: (conditions ?? []).filter((condition) => condition.question_id === question.id),
  }));

  return { formVersionId, formTitle: form?.title ?? "", questions: hydrated };
}
