"use server";

import { revalidatePath } from "next/cache";
import { assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { campaignInputSchema, positionInputSchema, type CampaignInput, type PositionInput } from "@/lib/validation/application-campaign";

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toNullableTimestamp(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

export async function createCampaign(input: CampaignInput): Promise<ActionResult<{ campaignId: string }>> {
  return runAction(async () => {
    await assertCapability("applications.manage");
    const data = campaignInputSchema.parse(input);
    const supabase = createSupabaseServerClient();

    const { data: campaign, error } = await supabase
      .from("application_campaigns")
      .insert({
        title: data.title,
        slug: `${slugify(data.title)}-${Math.random().toString(36).slice(2, 6)}`,
        description: data.description || null,
        academic_year: data.academicYear || null,
        opening_at: toNullableTimestamp(data.openingAt),
        closing_at: toNullableTimestamp(data.closingAt),
        eligibility_requirements: data.eligibilityRequirements || null,
        eligible_grade_level_ids: data.eligibleGradeLevelIds?.length ? data.eligibleGradeLevelIds : null,
        form_version_id: data.formVersionId || null,
        status: data.status,
        confirmation_message: data.confirmationMessage || null,
        contact_email: data.contactEmail || null,
        allow_reapply: data.allowReapply,
        blind_review: data.blindReview,
        withdrawal_deadline: toNullableTimestamp(data.withdrawalDeadline),
      })
      .select("id")
      .single();
    if (error) throw error;

    await recordAuditEvent({ action: "application_campaign.created", resourceType: "application_campaign", resourceId: campaign.id, afterState: data });
    revalidatePath("/admin/applications");
    return { campaignId: campaign.id };
  });
}

export async function updateCampaign(campaignId: string, input: CampaignInput): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("applications.manage");
    const data = campaignInputSchema.parse(input);
    const supabase = createSupabaseServerClient();

    const { data: before } = await supabase.from("application_campaigns").select("*").eq("id", campaignId).maybeSingle();

    const { error } = await supabase
      .from("application_campaigns")
      .update({
        title: data.title,
        description: data.description || null,
        academic_year: data.academicYear || null,
        opening_at: toNullableTimestamp(data.openingAt),
        closing_at: toNullableTimestamp(data.closingAt),
        eligibility_requirements: data.eligibilityRequirements || null,
        eligible_grade_level_ids: data.eligibleGradeLevelIds?.length ? data.eligibleGradeLevelIds : null,
        form_version_id: data.formVersionId || null,
        status: data.status,
        confirmation_message: data.confirmationMessage || null,
        contact_email: data.contactEmail || null,
        allow_reapply: data.allowReapply,
        blind_review: data.blindReview,
        withdrawal_deadline: toNullableTimestamp(data.withdrawalDeadline),
      })
      .eq("id", campaignId);
    if (error) throw error;

    await recordAuditEvent({ action: "application_campaign.updated", resourceType: "application_campaign", resourceId: campaignId, beforeState: before, afterState: data });
    revalidatePath("/admin/applications");
    revalidatePath(`/admin/applications/${campaignId}`);
    return undefined;
  });
}

export async function addPosition(campaignId: string, input: PositionInput): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("applications.manage");
    const data = positionInputSchema.parse(input);
    const supabase = createSupabaseServerClient();

    const { count } = await supabase
      .from("application_positions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    const { error } = await supabase.from("application_positions").insert({
      campaign_id: campaignId,
      title: data.title,
      description: data.description || null,
      responsibilities: data.responsibilities || null,
      eligibility: data.eligibility || null,
      max_seats: data.maxSeats ?? null,
      requires_interview: data.requiresInterview,
      sort_order: count ?? 0,
    });
    if (error) throw error;

    revalidatePath(`/admin/applications/${campaignId}`);
    return undefined;
  });
}

export async function deletePosition(campaignId: string, positionId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("applications.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("application_positions").delete().eq("id", positionId);
    if (error) throw error;
    revalidatePath(`/admin/applications/${campaignId}`);
    return undefined;
  });
}
