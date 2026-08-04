"use server";

import { revalidatePath } from "next/cache";
import { assertAnyCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createFormSchema,
  saveFormVersionQuestionsSchema,
  type FormQuestionInput,
} from "@/lib/validation/form-builder";
import type { FormKind } from "@/lib/constants";
import type { Capability } from "@/lib/permissions/capabilities";
import type { FormConditionOperator, Json } from "@/types/database";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CAPABILITY_BY_KIND: Record<FormKind, Capability> = {
  application: "applications.manage",
  survey: "surveys.manage",
  event_registration: "events.manage",
  other: "forms.manage",
};

export async function createForm(input: unknown): Promise<ActionResult<{ formId: string; formVersionId: string }>> {
  return runAction(async () => {
    const data = createFormSchema.parse(input);
    await assertAnyCapability([CAPABILITY_BY_KIND[data.kind], "forms.manage"]);

    const supabase = createSupabaseServerClient();
    const slug = `${slugify(data.title)}-${Math.random().toString(36).slice(2, 7)}`;

    const { data: form, error: formError } = await supabase
      .from("forms")
      .insert({ kind: data.kind, title: data.title, description: data.description || null, slug })
      .select("id")
      .single();
    if (formError) throw formError;

    const { data: version, error: versionError } = await supabase
      .from("form_versions")
      .insert({ form_id: form.id, version_number: 1, status: "draft" })
      .select("id")
      .single();
    if (versionError) throw versionError;

    await recordAuditEvent({ action: "form.created", resourceType: "form", resourceId: form.id, afterState: data });
    revalidatePath("/admin/forms");
    return { formId: form.id, formVersionId: version.id };
  });
}

export async function saveFormVersionQuestions(input: unknown): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const data = saveFormVersionQuestionsSchema.parse(input);
    const supabase = createSupabaseServerClient();

    const { data: version } = await supabase
      .from("form_versions")
      .select("id, status, form_id, forms(kind)")
      .eq("id", data.formVersionId)
      .maybeSingle();
    if (!version) throw new Error("Form version not found.");
    if (version.status !== "draft") throw new Error("Only draft versions can be edited. Duplicate it to a new draft first.");

    const kind = (version as unknown as { forms: { kind: FormKind } }).forms.kind;
    await assertAnyCapability([CAPABILITY_BY_KIND[kind], "forms.manage"]);

    const incomingKeys = data.questions.map((q) => q.key);
    if (incomingKeys.length > 0) {
      await supabase
        .from("form_questions")
        .delete()
        .eq("form_version_id", data.formVersionId)
        .not("key", "in", `(${incomingKeys.map((k) => `"${k}"`).join(",")})`);
    } else {
      await supabase.from("form_questions").delete().eq("form_version_id", data.formVersionId);
    }

    const questionIdByKey = new Map<string, string>();

    for (let index = 0; index < data.questions.length; index += 1) {
      const question = data.questions[index];
      const { data: saved, error } = await supabase
        .from("form_questions")
        .upsert(
          {
            form_version_id: data.formVersionId,
            key: question.key,
            type: question.type,
            label: question.label,
            description: question.description || null,
            placeholder: question.placeholder || null,
            help_text: question.helpText || null,
            is_required: question.isRequired,
            position: index,
            min_length: question.minLength ?? null,
            max_length: question.maxLength ?? null,
            min_number: question.minNumber ?? null,
            max_number: question.maxNumber ?? null,
            rating_scale: question.ratingScale ?? null,
            allowed_file_types: question.allowedFileTypes?.length ? question.allowedFileTypes : null,
            max_file_size_bytes: question.maxFileSizeBytes ?? null,
            choice_allow_other: question.choiceAllowOther,
            admin_notes: question.adminNotes || null,
            eligible_grade_level_ids: question.eligibleGradeLevelIds?.length ? question.eligibleGradeLevelIds : null,
            visible_for_position_ids: question.visibleForPositionIds?.length ? question.visibleForPositionIds : null,
          },
          { onConflict: "form_version_id,key" },
        )
        .select("id, key")
        .single();
      if (error) throw error;
      questionIdByKey.set(saved.key, saved.id);
    }

    const questionIds = Array.from(questionIdByKey.values());
    if (questionIds.length > 0) {
      await supabase.from("form_question_options").delete().in("question_id", questionIds);
      await supabase.from("form_conditions").delete().in("question_id", questionIds);
    }

    const optionRows = data.questions.flatMap((question) => {
      const questionId = questionIdByKey.get(question.key);
      if (!questionId) return [];
      return question.options.map((option, position) => ({
        question_id: questionId,
        value: option.value,
        label: option.label,
        position,
        is_other_option: option.isOtherOption,
      }));
    });
    if (optionRows.length > 0) {
      const { error } = await supabase.from("form_question_options").insert(optionRows);
      if (error) throw error;
    }

    const conditionRows = data.questions.flatMap((question) => {
      const questionId = questionIdByKey.get(question.key);
      if (!questionId) return [];
      return question.conditions
        .map((condition) => {
          const dependsOnId = questionIdByKey.get(condition.dependsOnQuestionKey);
          if (!dependsOnId) return null;
          return {
            question_id: questionId,
            depends_on_question_id: dependsOnId,
            operator: condition.operator,
            comparison_value: condition.comparisonValue ?? null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
    });
    if (conditionRows.length > 0) {
      const { error } = await supabase.from("form_conditions").insert(conditionRows);
      if (error) throw error;
    }

    revalidatePath("/admin/forms");
    return undefined;
  });
}

export async function publishFormVersion(formVersionId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const supabase = createSupabaseServerClient();
    const { data: version } = await supabase
      .from("form_versions")
      .select("id, form_id, forms(kind)")
      .eq("id", formVersionId)
      .maybeSingle();
    if (!version) throw new Error("Form version not found.");

    const kind = (version as unknown as { forms: { kind: FormKind } }).forms.kind;
    await assertAnyCapability([CAPABILITY_BY_KIND[kind], "forms.manage"]);

    const { error: versionError } = await supabase
      .from("form_versions")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", formVersionId);
    if (versionError) throw versionError;

    const { error: formError } = await supabase.from("forms").update({ status: "published" }).eq("id", version.form_id);
    if (formError) throw formError;

    await recordAuditEvent({ action: "form.published", resourceType: "form_version", resourceId: formVersionId });
    revalidatePath("/admin/forms");
    return undefined;
  });
}

export async function duplicateFormAsNewDraft(formId: string): Promise<ActionResult<{ formVersionId: string }>> {
  return runAction(async () => {
    const supabase = createSupabaseServerClient();
    const { data: form } = await supabase.from("forms").select("id, kind").eq("id", formId).maybeSingle();
    if (!form) throw new Error("Form not found.");
    await assertAnyCapability([CAPABILITY_BY_KIND[form.kind], "forms.manage"]);

    const { data: latest } = await supabase
      .from("form_versions")
      .select("id, version_number")
      .eq("form_id", formId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersionNumber = (latest?.version_number ?? 0) + 1;
    const { data: newVersion, error } = await supabase
      .from("form_versions")
      .insert({ form_id: formId, version_number: nextVersionNumber, status: "draft" })
      .select("id")
      .single();
    if (error) throw error;

    if (latest) {
      const { data: sourceQuestions } = await supabase
        .from("form_questions")
        .select("*, form_question_options(*), form_conditions(*)")
        .eq("form_version_id", latest.id)
        .order("position");

      const idMap = new Map<string, string>();
      type SourceQuestion = NonNullable<typeof sourceQuestions>[number];
      for (const question of sourceQuestions ?? []) {
        const { data: inserted, error: qError } = await supabase
          .from("form_questions")
          .insert({
            form_version_id: newVersion.id,
            key: question.key,
            type: question.type,
            label: question.label,
            description: question.description,
            placeholder: question.placeholder,
            help_text: question.help_text,
            is_required: question.is_required,
            position: question.position,
            min_length: question.min_length,
            max_length: question.max_length,
            min_number: question.min_number,
            max_number: question.max_number,
            rating_scale: question.rating_scale,
            allowed_file_types: question.allowed_file_types,
            max_file_size_bytes: question.max_file_size_bytes,
            choice_allow_other: question.choice_allow_other,
            admin_notes: question.admin_notes,
            eligible_grade_level_ids: question.eligible_grade_level_ids,
            visible_for_position_ids: question.visible_for_position_ids,
          })
          .select("id")
          .single();
        if (qError) throw qError;
        idMap.set(question.id, inserted.id);
      }

      const optionRows = (sourceQuestions ?? []).flatMap((question: SourceQuestion) => {
        const newQuestionId = idMap.get(question.id);
        const options = (question as unknown as { form_question_options: { value: string; label: string; position: number; is_other_option: boolean }[] }).form_question_options;
        if (!newQuestionId || !options) return [];
        return options.map((option) => ({ ...option, question_id: newQuestionId }));
      });
      if (optionRows.length > 0) await supabase.from("form_question_options").insert(optionRows);

      const conditionRows = (sourceQuestions ?? []).flatMap((question: SourceQuestion) => {
        const newQuestionId = idMap.get(question.id);
        const conditions = (
          question as unknown as {
            form_conditions: { depends_on_question_id: string; operator: FormConditionOperator; comparison_value: Json }[];
          }
        ).form_conditions;
        if (!newQuestionId || !conditions) return [];
        return conditions
          .map((condition) => {
            const newDependsOnId = idMap.get(condition.depends_on_question_id);
            if (!newDependsOnId) return null;
            return {
              question_id: newQuestionId,
              depends_on_question_id: newDependsOnId,
              operator: condition.operator,
              comparison_value: condition.comparison_value,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);
      });
      if (conditionRows.length > 0) await supabase.from("form_conditions").insert(conditionRows);

      await supabase.from("forms").update({ status: "draft" }).eq("id", formId);
    }

    revalidatePath("/admin/forms");
    return { formVersionId: newVersion.id };
  });
}

export async function archiveForm(formId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const supabase = createSupabaseServerClient();
    const { data: form } = await supabase.from("forms").select("kind").eq("id", formId).maybeSingle();
    if (!form) throw new Error("Form not found.");
    await assertAnyCapability([CAPABILITY_BY_KIND[form.kind], "forms.manage"]);

    const { error } = await supabase
      .from("forms")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", formId);
    if (error) throw error;

    await recordAuditEvent({ action: "form.archived", resourceType: "form", resourceId: formId });
    revalidatePath("/admin/forms");
    return undefined;
  });
}

// Re-exported for the builder UI's zod-resolved client form.
export type { FormQuestionInput };
