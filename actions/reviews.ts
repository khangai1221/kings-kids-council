"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser, assertAnyCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { submitReviewSchema } from "@/lib/validation/review";

export async function assignReviewer(submissionId: string, reviewerId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertAnyCapability(["reviewers.manage", "applications.manage"]);
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();

    const { data: assignment, error } = await supabase
      .from("review_assignments")
      .insert({ submission_id: submissionId, reviewer_id: reviewerId, assigned_by: user.profile.id })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("application_reviews").insert({ assignment_id: assignment.id, submission_id: submissionId, reviewer_id: reviewerId });

    await recordAuditEvent({ action: "review.assigned", resourceType: "review_assignment", resourceId: assignment.id });
    revalidatePath("/admin/reviews");
    return undefined;
  });
}

export async function declareConflictOfInterest(assignmentId: string, note: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("review_assignments")
      .update({ conflict_of_interest: true, conflict_note: note, status: "declined" })
      .eq("id", assignmentId)
      .eq("reviewer_id", user.profile.id);
    if (error) throw error;
    revalidatePath("/admin/reviews");
    return undefined;
  });
}

export async function saveReview(input: unknown): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const data = submitReviewSchema.parse(input);
    const supabase = createSupabaseServerClient();

    const { data: review } = await supabase
      .from("application_reviews")
      .select("id, status")
      .eq("submission_id", data.submissionId)
      .eq("reviewer_id", user.profile.id)
      .maybeSingle();
    if (!review) throw new Error("You are not assigned to review this application.");
    if (review.status === "submitted") throw new Error("This review has already been submitted.");

    const { error: updateError } = await supabase
      .from("application_reviews")
      .update({
        recommendation: data.recommendation ?? null,
        private_comments: data.privateComments || null,
        status: data.submit ? "submitted" : "draft",
        submitted_at: data.submit ? new Date().toISOString() : null,
      })
      .eq("id", review.id);
    if (updateError) throw updateError;

    await supabase.from("application_review_scores").delete().eq("review_id", review.id);
    if (data.scores.length > 0) {
      const { error: scoresError } = await supabase.from("application_review_scores").insert(
        data.scores.map((score) => ({ review_id: review.id, rubric_item_id: score.rubricItemId, score: score.score, note: score.note || null })),
      );
      if (scoresError) throw scoresError;
    }

    await supabase.from("review_assignments").update({ status: data.submit ? "completed" : "in_progress" }).eq("submission_id", data.submissionId).eq("reviewer_id", user.profile.id);

    if (data.submit) {
      await recordAuditEvent({ action: "review.submitted", resourceType: "application_review", resourceId: review.id });
    }

    revalidatePath(`/admin/reviews/${data.submissionId}`);
    return undefined;
  });
}
