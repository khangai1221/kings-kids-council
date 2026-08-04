import { notFound } from "next/navigation";
import { requireAnyCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydrateFormVersion } from "@/lib/forms/hydrate";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormBuilder } from "@/components/admin/forms/form-builder";
import { FormVersionActions } from "@/app/admin/forms/[formId]/form-version-actions";
import type { BuilderQuestion } from "@/components/admin/forms/form-builder-types";

export default async function AdminFormDetailPage({ params }: { params: Promise<{ formId: string }> }) {
  await requireAnyCapability(["forms.manage", "applications.manage", "surveys.manage", "events.manage"]);
  const { formId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: form } = await supabase.from("forms").select("*").eq("id", formId).maybeSingle();
  if (!form) notFound();

  const { data: versions } = await supabase
    .from("form_versions")
    .select("*")
    .eq("form_id", formId)
    .order("version_number", { ascending: false });

  const currentVersion = versions?.find((v) => v.status === "draft") ?? versions?.[0];
  const hydrated = currentVersion ? await hydrateFormVersion(currentVersion.id) : null;

  const builderQuestions: BuilderQuestion[] =
    hydrated?.questions.map((question) => ({
      uiId: question.id,
      key: question.key,
      type: question.type,
      label: question.label,
      description: question.description ?? "",
      placeholder: question.placeholder ?? "",
      helpText: question.help_text ?? "",
      isRequired: question.is_required,
      minLength: question.min_length,
      maxLength: question.max_length,
      minNumber: question.min_number,
      maxNumber: question.max_number,
      ratingScale: question.rating_scale,
      allowedFileTypes: question.allowed_file_types ?? [],
      maxFileSizeBytes: question.max_file_size_bytes,
      choiceAllowOther: question.choice_allow_other,
      adminNotes: question.admin_notes ?? "",
      eligibleGradeLevelIds: question.eligible_grade_level_ids ?? [],
      visibleForPositionIds: question.visible_for_position_ids ?? [],
      options: question.options.map((o) => ({ value: o.value, label: o.label, isOtherOption: o.is_other_option })),
      conditions: question.conditions.map((c) => {
        const dependsOn = hydrated?.questions.find((q) => q.id === c.depends_on_question_id);
        return {
          dependsOnQuestionKey: dependsOn?.key ?? "",
          operator: c.operator as BuilderQuestion["conditions"][number]["operator"],
          comparisonValue: typeof c.comparison_value === "string" ? c.comparison_value : JSON.stringify(c.comparison_value ?? ""),
        };
      }),
    })) ?? [];

  const { data: gradeLevels } = await supabase.from("grade_levels").select("*").order("sort_order");

  return (
    <div>
      <PageHeader
        title={form.title}
        description={form.description ?? undefined}
        actions={
          <>
            <StatusBadge status={form.status} />
            <FormVersionActions formId={form.id} />
          </>
        }
      />

      {versions && versions.length > 1 ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Version {currentVersion?.version_number} of {versions.length} · older versions remain linked to their historical submissions.
        </p>
      ) : null}

      {currentVersion ? (
        <FormBuilder
          formVersionId={currentVersion.id}
          isDraft={currentVersion.status === "draft"}
          initialQuestions={builderQuestions}
          gradeLevels={gradeLevels ?? []}
        />
      ) : null}
    </div>
  );
}
