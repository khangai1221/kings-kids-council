/**
 * Pure email-domain check, deliberately dependency-free so it can be unit
 * tested without mocking Next.js/Clerk/Supabase. Server call sites should
 * pass env.ALLOWED_EMAIL_DOMAIN (see lib/auth/current-user.ts).
 */
export function isEmailInAllowedDomain(email: string, allowedDomain: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedDomain = allowedDomain.trim().toLowerCase().replace(/^@/, "");
  if (!normalizedEmail || !normalizedDomain) return false;
  return normalizedEmail.endsWith(`@${normalizedDomain}`);
}
