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

export default clerkMiddleware(async (authFn, request) => {
  const { userId } = await authFn();
  const { pathname } = request.nextUrl;

  if (!userId && !isPublicPath(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
