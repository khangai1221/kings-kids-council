import { getSiteSettings } from "@/lib/settings/service";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function safeHex(value: string, fallback: string): string {
  return HEX_COLOR_PATTERN.test(value) ? value : fallback;
}

/**
 * Renders an inline <style> overriding the default brand CSS variables with
 * whatever an admin has configured in site_settings. Values are validated as
 * strict 6-digit hex before interpolation (defense in depth even though only
 * settings.manage-capable admins can write these).
 */
export async function DynamicThemeStyle() {
  const settings = await getSiteSettings();

  const css = `:root {
  --brand-primary: ${safeHex(settings.primary_color, "#193b75")};
  --brand-primary-dark: ${safeHex(settings.primary_color_dark, "#10284f")};
  --brand-accent: ${safeHex(settings.accent_color, "#f2b84b")};
  --brand-success: ${safeHex(settings.success_color, "#15803d")};
  --brand-warning: ${safeHex(settings.warning_color, "#b45309")};
  --brand-error: ${safeHex(settings.error_color, "#b42318")};
  --brand-info: ${safeHex(settings.info_color, "#2563eb")};
}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
