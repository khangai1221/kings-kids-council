import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { clientEnv } from "@/lib/env.client";
import { env } from "@/lib/env.server";

let cachedClient: ReturnType<typeof createClient<Database>> | undefined;

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * Restricted to a small, explicit allow-list of call sites, each of which
 * must perform (and comment) its own authorization check before using this
 * client:
 *   - lib/webhooks/clerk.ts (no user session exists yet during sync)
 *   - lib/notifications/push-dispatch.ts (reads FCM tokens to fan out a push
 *     that an admin action already authorized via the request-scoped client)
 *   - lib/settings/service.ts (inside unstable_cache, which forbids
 *     cookies/auth() entirely; safe because site_settings is granted
 *     `select` to the `anon` role under RLS — nothing gained by bypassing it)
 *
 * Do not import this into a Client Component or reach for it as a shortcut
 * to bypass an RLS error — fix the policy or use the appropriate
 * SECURITY DEFINER RPC instead.
 */
export function createSupabaseAdminClient() {
  if (!cachedClient) {
    cachedClient = createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}
