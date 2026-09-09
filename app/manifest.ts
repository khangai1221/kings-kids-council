import type { MetadataRoute } from "next";
import { clientEnv } from "@/lib/env.client";

/**
 * Static web app manifest. This route is deliberately NOT dependent on any
 * request-time API (no Supabase, no Clerk `auth()`): the proxy matcher in
 * `proxy.ts` excludes any path containing a dot, so `/manifest.webmanifest`
 * never runs through `clerkMiddleware()` and calling `auth()` here throws.
 * The portal name comes from the build-time public env instead of
 * `site_settings`; the manifest rarely needs to track a live rename.
 */
export default function manifest(): MetadataRoute.Manifest {
  const name = clientEnv.NEXT_PUBLIC_APP_NAME || "Student Council";

  return {
    name,
    short_name: name.length > 12 ? "Council" : name,
    description: `${name} — the private student council portal.`,
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fb",
    theme_color: "#193b75",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
