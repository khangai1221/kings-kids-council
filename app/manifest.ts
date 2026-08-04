import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/settings/service";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();

  return {
    name: settings.portal_name,
    short_name: settings.portal_name,
    description: `${settings.portal_name} — student council portal for ${settings.school_name}`,
    start_url: "/",
    display: "standalone",
    background_color: settings.background_color,
    theme_color: settings.primary_color,
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
