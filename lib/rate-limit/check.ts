import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Throws if the caller has exceeded the given rate limit bucket. */
export async function enforceRateLimit(bucketKey: string, windowSeconds: number, maxRequests: number): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_bucket_key: bucketKey,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });
  if (allowed === false) {
    throw new Error("Too many requests. Please try again later.");
  }
}
