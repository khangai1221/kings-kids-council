import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydrateFormVersion } from "@/lib/forms/hydrate";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicationForm } from "@/app/(portal)/applications/submissions/[submissionId]/application-form";
import { WithdrawButton } from "@/app/(portal)/applications/submissions/[submissionId]/withdraw-button";
import type { AnswersByQuestionKey, FileAnswerValue } from "@/lib/forms/types";

const WITHDRAWABLE_STATUSES = new Set(["submitted", "under_review", "interview"]);

export default async function ApplicationSubmissionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const user = await requireOnboardedUser();
  const { submissionId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: submission } = await supabase
    .from("application_submissions")
    .select("*, application_campaigns(title), application_positions(title)")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission || submission.student_id !== user.profile.id) notFound();

  const campaignTitle = (submission as unknown as { application_campaigns: { title: string } }).application_campaigns?.title;
  const positionTitle = (submission as unknown as { application_positions: { title: string } }).application_positions?.title;

  const hydrated = await hydrateFormVersion(submission.form_version_id);
  const { data: answerRows } = await supabase
    .from("application_answers")
    .select("question_id, value_json, file_record_id")
    .eq("submission_id", submissionId);

  const questionKeyById = new Map((hydrated?.questions ?? []).map((q) => [q.id, q.key]));
  const answers: AnswersByQuestionKey = {};
  for (const row of answerRows ?? []) {
    const key = questionKeyById.get(row.question_id);
    if (!key) continue;
    answers[key] = row.file_record_id
      ? ({ fileRecordId: row.file_record_id, filename: (row.value_json as { filename?: string })?.filename ?? "file" } as FileAnswerValue)
      : (row.value_json as never);
  }

  const { data: history } = await supabase
    .from("application_status_history")
    .select("*")
    .eq("submission_id", submissionId)
    .order("changed_at", { ascending: false });

  const isDraft = submission.status === "draft";

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={positionTitle ?? "Application"}
        description={campaignTitle}
        actions={<StatusBadge status={submission.status} />}
      />

      {submission.returned_for_correction_reason && isDraft ? (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-warning">Returned for correction</p>
            <p className="mt-1 text-muted-foreground">{submission.returned_for_correction_reason}</p>
          </CardContent>
        </Card>
      ) : null}

      {hydrated ? (
        <ApplicationForm
          submissionId={submission.id}
          questions={hydrated.questions}
          initialAnswers={answers}
          gradeLevelId={user.profile.grade_level_id}
          positionId={submission.position_id}
        />
      ) : null}

      {!isDraft && WITHDRAWABLE_STATUSES.has(submission.status) ? (
        <div className="mt-6">
          <WithdrawButton submissionId={submission.id} />
        </div>
      ) : null}

      {history && history.length > 1 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Status history</h2>
          <ol className="space-y-2 border-l border-border pl-4">
            {history.map((entry) => (
              <li key={entry.id} className="text-sm">
                <span className="font-medium text-foreground capitalize">{entry.to_status.replace("_", " ")}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.changed_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
