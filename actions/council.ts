"use server";

import { revalidatePath } from "next/cache";
import { assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createCouncilMember(input: {
  termId: string;
  positionId?: string;
  displayName: string;
  gradeLevelLabel?: string;
  shortBio?: string;
  responsibilities?: string;
  termStart?: string;
  termEnd?: string;
  status: "draft" | "published";
}): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("council.manage");
    const supabase = createSupabaseServerClient();
    const { count } = await supabase.from("council_members").select("id", { count: "exact", head: true }).eq("term_id", input.termId);

    const { error } = await supabase.from("council_members").insert({
      term_id: input.termId,
      position_id: input.positionId || null,
      display_name: input.displayName,
      grade_level_label: input.gradeLevelLabel || null,
      short_bio: input.shortBio || null,
      responsibilities: input.responsibilities || null,
      term_start: input.termStart || null,
      term_end: input.termEnd || null,
      status: input.status,
      sort_order: count ?? 0,
    });
    if (error) throw error;
    revalidatePath("/admin/council");
    revalidatePath("/council/members");
    return undefined;
  });
}

export async function updateCouncilMemberStatus(memberId: string, status: "draft" | "published" | "archived"): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("council.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("council_members").update({ status }).eq("id", memberId);
    if (error) throw error;
    revalidatePath("/admin/council");
    revalidatePath("/council/members");
    return undefined;
  });
}

export async function createCouncilTerm(input: { title: string; academicYear: string; startDate: string; endDate: string }): Promise<ActionResult<{ termId: string }>> {
  return runAction(async () => {
    await assertCapability("council.manage");
    const supabase = createSupabaseServerClient();
    const { data: term, error } = await supabase
      .from("council_terms")
      .insert({ title: input.title, academic_year: input.academicYear, start_date: input.startDate, end_date: input.endDate })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/admin/council");
    return { termId: term.id };
  });
}
