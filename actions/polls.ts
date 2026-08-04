"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser, assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pollInputSchema, type PollInput } from "@/lib/validation/polls";
import type { PollStatus } from "@/lib/constants";

export async function castPollVote(pollId: string, optionId: string): Promise<ActionResult<{ optionId: string }>> {
  return runAction(async () => {
    await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("cast_poll_vote", { p_poll_id: pollId, p_option_id: optionId });
    if (error) throw new Error(error.message);

    const result = data as unknown as { option_id: string };
    revalidatePath("/polls");
    return { optionId: result.option_id };
  });
}

export async function createPoll(input: unknown): Promise<ActionResult<{ pollId: string }>> {
  return runAction(async () => {
    await assertCapability("polls.manage");
    const data: PollInput = pollInputSchema.parse(input);
    const supabase = createSupabaseServerClient();
    const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: poll, error } = await supabase
      .from("polls")
      .insert({
        title: data.title,
        slug,
        description: data.description || null,
        status: data.status,
        opens_at: data.opensAt || null,
        closes_at: data.closesAt || null,
        eligible_grade_level_ids: data.eligibleGradeLevelIds ?? [],
      })
      .select("id")
      .single();
    if (error) throw error;

    const { error: optionsError } = await supabase.from("poll_options").insert(
      data.options.map((label, index) => ({ poll_id: poll.id, label, sort_order: index })),
    );
    if (optionsError) throw optionsError;

    await recordAuditEvent({ action: "poll.created", resourceType: "poll", resourceId: poll.id });
    revalidatePath("/admin/polls");
    return { pollId: poll.id };
  });
}

export async function updatePollStatus(pollId: string, status: PollStatus): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("polls.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("polls").update({ status }).eq("id", pollId);
    if (error) throw error;

    await recordAuditEvent({ action: "poll.status_updated", resourceType: "poll", resourceId: pollId, afterState: { status } });
    revalidatePath("/admin/polls");
    revalidatePath(`/admin/polls/${pollId}`);
    return undefined;
  });
}

export async function deletePoll(pollId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("polls.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("polls").delete().eq("id", pollId);
    if (error) throw error;

    await recordAuditEvent({ action: "poll.deleted", resourceType: "poll", resourceId: pollId });
    revalidatePath("/admin/polls");
    return undefined;
  });
}
