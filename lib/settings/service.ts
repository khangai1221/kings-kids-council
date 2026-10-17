import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SiteSettingsRow } from "@/types/database";

export type SiteSettings = SiteSettingsRow;

const FALLBACK_SETTINGS: SiteSettings = {
  singleton: true,
  portal_name: "King's Kids Student Council",
  portal_logo_url: null,
  school_name: "King's Kids School",
  allowed_email_domain: "kingskids.mn",
  primary_color: "#193B75",
  primary_color_dark: "#10284F",
  accent_color: "#F2B84B",
  background_color: "#F5F7FB",
  surface_color: "#FFFFFF",
  text_color: "#172033",
  muted_text_color: "#667085",
  success_color: "#15803D",
  warning_color: "#B45309",
  error_color: "#B42318",
  info_color: "#2563EB",
  contact_email: null,
  academic_year: "",
  council_mission: null,
  privacy_notice: null,
  terms_content: null,
  notification_defaults: {},
  min_reporting_privacy_threshold: 5,
  file_upload_max_size_bytes: 10485760,
  allowed_file_types: ["pdf", "doc", "docx", "png", "jpg", "jpeg"],
  timezone: "Asia/Ulaanbaatar",
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};

/**
 * Fetches the singleton row with the service-role client (no cookies/auth()
 * involved — required inside unstable_cache, which forbids request-scoped
 * data sources) and caches it across requests/users for a minute. This is
 * safe: `site_settings` is readable by `anon` under RLS (site_settings_select_all
 * `using (true)`), so the admin client reveals nothing a visitor couldn't
 * already select themselves. Almost every page calls this, so turning a
 * per-request DB round trip into a once-a-minute one is the single biggest
 * lever on response time available here.
 */
const fetchSiteSettings = unstable_cache(
  async (): Promise<SiteSettings | null> => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("site_settings").select("*").eq("singleton", true).maybeSingle();
    if (error) {
      console.error("Failed to load site settings, using fallback", error);
      return null;
    }
    return data;
  },
  ["site-settings"],
  { tags: ["site-settings"], revalidate: 60 },
);

/**
 * Typed settings accessor — the only place in the app that should read
 * site_settings directly, so callers never hand-parse arbitrary JSON.
 * Falls back to sensible defaults if the singleton row is unreachable
 * (e.g. a mid-migration state) rather than throwing on every page. The
 * outer `cache()` just dedupes repeat calls within a single request on top
 * of the cross-request cache above.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const data = await fetchSiteSettings();
  return data ?? FALLBACK_SETTINGS;
});
