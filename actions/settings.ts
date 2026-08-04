"use server";

import { revalidatePath } from "next/cache";
import { assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadFile } from "@/lib/storage/upload";
import { siteSettingsSchema } from "@/lib/validation/site-settings";

export async function updateSiteSettings(input: unknown): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCapability("settings.manage");
    const data = siteSettingsSchema.parse(input);
    const supabase = createSupabaseServerClient();

    const { data: before } = await supabase.from("site_settings").select("*").eq("singleton", true).maybeSingle();

    const { error } = await supabase
      .from("site_settings")
      .update({
        portal_name: data.portalName,
        school_name: data.schoolName,
        contact_email: data.contactEmail || null,
        primary_color: data.primaryColor,
        primary_color_dark: data.primaryColorDark,
        accent_color: data.accentColor,
        success_color: data.successColor,
        warning_color: data.warningColor,
        error_color: data.errorColor,
        info_color: data.infoColor,
        council_mission: data.councilMission || null,
        privacy_notice: data.privacyNotice || null,
        terms_content: data.termsContent || null,
        min_reporting_privacy_threshold: data.minReportingPrivacyThreshold,
        file_upload_max_size_bytes: data.fileUploadMaxSizeMb * 1024 * 1024,
        updated_by: user.profile.id,
      })
      .eq("singleton", true);
    if (error) throw new Error(error.message);

    await recordAuditEvent({ action: "site_settings.updated", resourceType: "site_settings", beforeState: before, afterState: data });
    revalidatePath("/", "layout");
    return undefined;
  });
}

export async function uploadPortalLogo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    await assertCapability("settings.manage");
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("No file provided.");

    const supabase = createSupabaseServerClient();
    const uploaded = await uploadFile({
      bucket: "public-assets",
      purpose: "portal_logo",
      file,
      pathPrefix: "branding",
      allowedExtensions: ["png", "jpg", "jpeg", "webp", "svg"],
      maxSizeBytes: 2 * 1024 * 1024,
    });

    const { data: publicUrl } = supabase.storage.from("public-assets").getPublicUrl(uploaded.storagePath);

    const { error } = await supabase
      .from("site_settings")
      .update({ portal_logo_url: publicUrl.publicUrl })
      .eq("singleton", true);
    if (error) throw new Error(error.message);

    await recordAuditEvent({
      action: "site_settings.logo_updated",
      resourceType: "site_settings",
      afterState: { portal_logo_url: publicUrl.publicUrl },
    });
    revalidatePath("/", "layout");
    return { url: publicUrl.publicUrl };
  });
}
