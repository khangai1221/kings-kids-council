import { notFound } from "next/navigation";
import { requireStaffAccess } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydrateFormVersion } from "@/lib/forms/hydrate";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewForm } from "@/app/admin/reviews/[submissionId]/review-form";

export default async function AdminReviewDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const user = await requireStaffAccess();
  const { submissionId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: submission } = await supabase
    .from("application_submissions")
    .select("*, profiles(display_name, school_email, grade_level_id), application_positions(title), application_campaigns(title, review_rubric_id)")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission) notFound();

  const campaign = (submission as unknown as { application_campaigns: { title: string; review_rubric_id: string | null } }).application_campaigns;
  const applicant = (submission as unknown as { profiles: { display_name: string; school_email: string } }).profiles;
  const position = (submission as unknown as { application_positions: { title: string } }).application_positions;

  const hydrated = await hydrateFormVersion(submission.form_version_id);
  const { data: answerRows } = await supabase.from("application_answers").select("*").eq("submission_id", submissionId);
  const answersByQuestionId = new Map((answerRows ?? []).map((a) => [a.question_id, a]));

  const { data: myReview } = await supabase
    .from("application_reviews")
    .select("*, application_review_scores(*)")
    .eq("submission_id", submissionId)
    .eq("reviewer_id", user.profile.id)
    .maybeSingle();

  const { data: rubricItems } = campaign?.review_rubric_id
    ? await supabase.from("review_rubric_items").select("*").eq("rubric_id", campaign.review_rubric_id).order("position")
    : { data: [] };

  const { data: otherReviews } = await supabase
    .from("application_reviews")
    .select("id, reviewer_id, recommendation, status, profiles(display_name)")
    .eq("submission_id", submissionId)
    .neq("reviewer_id", user.profile.id);

  return (
    <div>
      <PageHeader title={applicant?.display_name ?? "Applicant"} description={`${position?.title} · ${campaign?.title}`} actions={<StatusBadge status={submission.status} />} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Application answers</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(hydrated?.questions ?? []).filter((q) => q.type !== "section_heading" && q.type !== "information_block").map((question) => {
                const answer = answersByQuestionId.get(question.id);
                return (
                  <div key={question.id}>
                    <p className="text-sm font-medium text-foreground">{question.label}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {answer?.file_record_id
                        ? `📎 ${(answer.value_json as { filename?: string })?.filename ?? "Attached file"}`
                        : typeof answer?.value_json === "string" || typeof answer?.value_json === "number"
                          ? String(answer.value_json)
                          : Array.isArray(answer?.value_json)
                            ? (answer.value_json as string[]).join(", ")
                            : "—"}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {otherReviews && otherReviews.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Other reviewers</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {otherReviews.map((review) => {
                  const reviewer = (review as unknown as { profiles: { display_name: string } }).profiles;
                  return (
                    <div key={review.id} className="flex items-center justify-between text-sm">
                      <span>{reviewer?.display_name}</span>
                      <div className="flex items-center gap-2">
                        {review.recommendation ? <span className="capitalize text-muted-foreground">{review.recommendation.replace("_", " ")}</span> : null}
                        <StatusBadge status={review.status} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground">
              Other reviewers&apos; scores are hidden until you submit your own review (blind review mode).
            </p>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Your review</CardTitle></CardHeader>
          <CardContent>
            <ReviewForm
              submissionId={submissionId}
              rubricItems={rubricItems ?? []}
              initialScores={(myReview as unknown as { application_review_scores: never[] })?.application_review_scores ?? []}
              initialRecommendation={myReview?.recommendation ?? null}
              initialComments={myReview?.private_comments ?? ""}
              isSubmitted={myReview?.status === "submitted"}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
