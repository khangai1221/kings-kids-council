import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { clientEnv } from "@/lib/env.client";

/**
 * Request-scoped Supabase client that authenticates as the current Clerk
 * user. Every query through this client is subject to Postgres RLS as that
 * user — this is the client almost all server code (Server Components,
 * Server Actions, Route Handlers) should use.
 *
 * Create a new instance per request; never cache/module-scope this since the
 * access token differs per signed-in user.
 */
export function createSupabaseServerClient() {
  return createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    async accessToken() {
      const { getToken } = await auth();
      return await getToken();
    },
  });
}
