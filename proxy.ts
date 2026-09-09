import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Next.js 16 renamed `middleware.ts` -> `proxy.ts` (same underlying feature).
 * This layer only handles the coarse "is there a session at all" redirect
 * for a snappy UX; it deliberately does NOT do fine-grained authorization
 * (Clerk's own current guidance: `createRouteMatcher`-based route
 * protection is deprecated in favor of checking access close to the
 * resource). Real authorization — role/capability checks, onboarding
 * status, email-domain re-verification — happens in lib/auth/require.ts on
 * every Server Component/Action/Route Handler, backed by Supabase RLS as
 * the final layer. Never assume this file is sufficient on its own.
 */
const PUBLIC_PATH_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/unauthorized",
  "/privacy",
  "/terms",
  "/api/webhooks",
  "/manifest.webmanifest",
  "/firebase-messaging-sw.js",
  "/offline",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default clerkMiddleware(
  async (authFn, request) => {
    const { userId } = await authFn();
    const { pathname } = request.nextUrl;

    if (!userId && !isPublicPath(pathname)) {
      // Send unauthenticated visitors to sign-up first (this portal is rolling
      // out to a whole school of new accounts); the sign-up screen has a
      // prominent "already have an account? sign in" link. The original
      // destination is preserved so post-auth they land where they intended.
      const signUpUrl = new URL("/sign-up", request.url);
      signUpUrl.searchParams.set("redirect_url", pathname);
      return NextResponse.redirect(signUpUrl);
    }

    return NextResponse.next();
  },
  // Dev-only: tolerate a larger gap between this machine's clock and Clerk's.
  // A local Windows clock that drifts even ~10s makes freshly issued session
  // tokens look "issued in the future", which Clerk rejects → an infinite
  // sign-in redirect loop. Hosted runtimes (Vercel) are NTP-synced so the
  // default 5s tolerance is kept in production. The real fix is still to sync
  // the dev machine's clock.
  process.env.NODE_ENV === "production" ? undefined : { clockSkewInMs: 60_000 },
);

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
