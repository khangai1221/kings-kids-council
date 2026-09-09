import type { NextConfig } from "next";

const supabaseHostname = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const clerkFrontendApi = (() => {
  try {
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (!key) return undefined;
    const decoded = Buffer.from(key.replace(/^pk_(test|live)_/, ""), "base64").toString(
      "utf-8",
    );
    return decoded.replace(/\$$/, "");
  } catch {
    return undefined;
  }
})();

const contentSecurityPolicy = [
  `default-src 'self'`,
  // https://www.gstatic.com — the Firebase Cloud Messaging service worker
  // (app/firebase-messaging-sw.js) importScripts() the firebase compat SDK from there.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://www.gstatic.com ${clerkFrontendApi ? `https://${clerkFrontendApi}` : ""}`,
  `style-src 'self' 'unsafe-inline' https://fonts.cloudflare.com`,
  `img-src 'self' data: blob: https://img.clerk.com https://challenges.cloudflare.com ${supabaseHostname ? `https://${supabaseHostname}` : ""}`,
  `font-src 'self' data: https://fonts.cloudflare.com`,
  `connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.com https://clerk-telemetry.com https://*.clerk-telemetry.com https://challenges.cloudflare.com ${supabaseHostname ? `https://${supabaseHostname} wss://${supabaseHostname}` : ""} https://fcm.googleapis.com https://firebaseinstallations.googleapis.com https://*.googleapis.com`,
  `frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
]
  .map((line) => line.trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname }]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The Firebase messaging service worker must not be cached aggressively.
        source: "/firebase-messaging-sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
  async redirects() {
    return [];
  },
};

export default nextConfig;
