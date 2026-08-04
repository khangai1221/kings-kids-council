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
    .from("profiles")
    .select("display_name, school_email, role, account_status, grade_levels(label)")
    .order("display_name");

  const rows = (data ?? []).map((row) => {
    const grade = (row as unknown as { grade_levels: { label: string } | null }).grade_levels;
    return {
      name: row.display_name ?? "",
      email: row.school_email,
      role: row.role,
      status: row.account_status,
      grade: grade?.label ?? "",
    };
  });

  const csv = toCsv(rows, [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "grade", label: "Grade" },
  ]);

  await recordAuditEvent({ action: "report.exported", resourceType: "profiles", afterState: { rowCount: rows.length } });

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="students.csv"' },
  });
}
