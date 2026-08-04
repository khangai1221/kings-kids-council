"use client";

import { useAuth } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import type { Database } from "@/types/database";
import { clientEnv } from "@/lib/env.client";

/**
 * Browser Supabase client bound to the current Clerk session. Use this only
 * in Client Components that need Realtime subscriptions — everything else
 * should read data via Server Components / Server Actions.
 */
export function useSupabaseClient() {
  const { getToken, isSignedIn } = useAuth();

  return useMemo(() => {
    return createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      async accessToken() {
        if (!isSignedIn) return null;
        return await getToken();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);
}
