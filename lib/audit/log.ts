import "server-only";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export interface AuditEventInput {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  reason?: string | null;
}

/**
 * Centralized audit logging. Never pass secrets, tokens, or full file
 * contents in beforeState/afterState — those are written verbatim to
 * audit_logs. Uses the request-scoped client so RLS attributes the row to
 * the acting user (see audit_logs_insert_self policy).
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const user = await getCurrentUser();
  const supabase = createSupabaseServerClient();

  let requestMetadata: Json = null;
  try {
    const headerList = await headers();
    requestMetadata = {
      userAgent: headerList.get("user-agent") ?? undefined,
      referer: headerList.get("referer") ?? undefined,
    } as Json;
  } catch {
    // headers() is unavailable outside a request context (e.g. some test harnesses); skip metadata.
  }

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: user?.profile.id ?? null,
    actor_role: user?.profile.role ?? null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    before_state: (input.beforeState as Json) ?? null,
    after_state: (input.afterState as Json) ?? null,
    reason: input.reason ?? null,
    request_metadata: requestMetadata,
  });

  if (error) {
    console.error("Failed to record audit event", input.action, error);
  }
}
