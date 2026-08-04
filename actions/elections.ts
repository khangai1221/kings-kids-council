"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser, assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { castVoteSchema, type CastVoteInput } from "@/lib/validation/election";
import { createNotification } from "@/lib/notifications/service";
import type { ElectionStatus } from "@/lib/constants";
import type { Json, TablesUpdate } from "@/types/database";

export async function castElectionVote(input: CastVoteInput): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const data = castVoteSchema.parse(input);
    const supabase = createSupabaseServerClient();

    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: `vote_submit:${user.profile.id}`,
      p_window_seconds: 3600,
      p_max_requests: 30,
    });
    if (allowed === false) throw new Error("Too many voting attempts. Please try again later.");

    const { error } = await supabase.rpc("cast_election_vote", {
      p_election_id: data.electionId,
      p_ballot: data.ballot as unknown as Json,
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/voting`);
    return undefined;
  });
}

export async function createElection(input: {
  title: string;
  description?: string;
  eligibleGradeLevelIds: string[];
  opensAt: string;
  closesAt: string;
  positions: { title: string; maxChoices: number }[];
}): Promise<ActionResult<{ electionId: string }>> {
  return runAction(async () => {
    await assertCapability("elections.manage");
    const supabase = createSupabaseServerClient();
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: election, error } = await supabase
      .from("elections")
      .insert({
        title: input.title,
        slug,
        description: input.description || null,
        eligible_grade_level_ids: input.eligibleGradeLevelIds,
        opens_at: input.opensAt,
        closes_at: input.closesAt,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;

    if (input.positions.length > 0) {
      await supabase.from("election_positions").insert(
        input.positions.map((position, index) => ({
          election_id: election.id,
          title: position.title,
          max_choices: position.maxChoices,
          sort_order: index,
        })),
      );
    }

    await recordAuditEvent({ action: "election.created", resourceType: "election", resourceId: election.id });
    revalidatePath("/admin/elections");
    return { electionId: election.id };
  });
}

export async function addCandidate(input: {
  electionPositionId: string;
  candidateName: string;
  gradeLevelLabel?: string;
  statement?: string;
  goals?: string;
  studentId?: string;
}): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("elections.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("election_candidates").insert({
      election_position_id: input.electionPositionId,
      candidate_name: input.candidateName,
      grade_level_label: input.gradeLevelLabel || null,
      statement: input.statement || null,
      goals: input.goals || null,
      student_id: input.studentId || null,
      approval_status: "approved",
    });
    if (error) throw error;
    revalidatePath("/admin/elections");
    return undefined;
  });
}

export async function updateElectionStatus(electionId: string, status: ElectionStatus, reason?: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const capability = status === "open" || status === "results_published" ? "elections.publish" : "elections.manage";
    await assertCapability(capability);
    const supabase = createSupabaseServerClient();

    const updates: TablesUpdate<"elections"> = { status };
    if (status === "results_published") updates.results_published_at = new Date().toISOString();

    const { data: before } = await supabase.from("elections").select("status, title").eq("id", electionId).maybeSingle();
    const { error } = await supabase.from("elections").update(updates).eq("id", electionId);
    if (error) throw new Error(error.message);

    await recordAuditEvent({
      action: `election.${status}`,
      resourceType: "election",
      resourceId: electionId,
      beforeState: before,
      afterState: { status },
      reason,
    });

    if (status === "open" && before) {
      // Notify eligible students that voting has opened (best-effort, capped for demo-scale schools).
      const { data: election } = await supabase.from("elections").select("eligible_grade_level_ids, slug").eq("id", electionId).maybeSingle();
      if (election) {
        let studentsQuery = supabase.from("profiles").select("id").eq("account_status", "active");
        if (election.eligible_grade_level_ids?.length) {
          studentsQuery = studentsQuery.in("grade_level_id", election.eligible_grade_level_ids);
        }
        const { data: students } = await studentsQuery.limit(500);
        for (const student of students ?? []) {
          await createNotification({
            userId: student.id,
            type: "election_opened",
            title: "Voting is open",
            message: `${before.title} is now open for voting.`,
            link: `/voting/${election.slug}`,
            relatedEntityType: "election",
            relatedEntityId: electionId,
          });
        }
      }
    }

    revalidatePath("/admin/elections");
    revalidatePath(`/admin/elections/${electionId}`);
    return undefined;
  });
}
