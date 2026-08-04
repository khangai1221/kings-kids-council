import { NextResponse } from "next/server";
import { assertCapability } from "@/lib/auth/require";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit/check";
import { toCsv } from "@/lib/csv/export";

export async function GET() {
  let userId: string;
  try {
    const user = await assertCapability("reports.export");
    userId = user.profile.id;
    await enforceRateLimit(`admin_export:${userId}`, 3600, 30);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Not authorized" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("application_submissions")
    .select("status, submitted_at, application_campaigns(title), application_positions(title), profiles(display_name, school_email)");

  const rows = (data ?? []).map((row) => {
    const campaign = (row as unknown as { application_campaigns: { title: string } }).application_campaigns;
    const position = (row as unknown as { application_positions: { title: string } }).application_positions;
    const profile = (row as unknown as { profiles: { display_name: string; school_email: string } }).profiles;
    return {
      campaign: campaign?.title ?? "",
      position: position?.title ?? "",
      student: profile?.display_name ?? "",
      email: profile?.school_email ?? "",
      status: row.status,
      submitted_at: row.submitted_at ?? "",
    };
  });

  const csv = toCsv(rows, [
    { key: "campaign", label: "Campaign" },
    { key: "position", label: "Position" },
    { key: "student", label: "Student" },
    { key: "email", label: "Email" },
    { key: "status", label: "Status" },
    { key: "submitted_at", label: "Submitted At" },
  ]);

  await recordAuditEvent({ action: "report.exported", resourceType: "application_submissions", afterState: { rowCount: rows.length } });

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="applications.csv"' },
  });
}
