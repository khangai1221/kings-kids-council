import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimpleBarChart } from "@/components/admin/reports/simple-bar-chart";
import { Download } from "lucide-react";

export const metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireCapability("reports.view");
  const supabase = createSupabaseServerClient();

  const [{ data: submissions }, { data: profiles }, { data: gradeLevels }] = await Promise.all([
    supabase.from("application_submissions").select("status"),
    supabase.from("profiles").select("grade_level_id").eq("account_status", "active"),
    supabase.from("grade_levels").select("*").order("sort_order"),
  ]);

  const statusCounts = new Map<string, number>();
  for (const submission of submissions ?? []) {
    statusCounts.set(submission.status, (statusCounts.get(submission.status) ?? 0) + 1);
  }
  const statusData = Array.from(statusCounts.entries()).map(([label, value]) => ({ label: label.replace(/_/g, " "), value }));

  const gradeCounts = new Map<string, number>();
  for (const profile of profiles ?? []) {
    if (profile.grade_level_id) gradeCounts.set(profile.grade_level_id, (gradeCounts.get(profile.grade_level_id) ?? 0) + 1);
  }
  const gradeData = (gradeLevels ?? []).map((grade) => ({ label: grade.label, value: gradeCounts.get(grade.id) ?? 0 }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="gap-1.5"><a href="/api/admin/reports/students"><Download className="size-4" /> Students CSV</a></Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5"><a href="/api/admin/reports/applications"><Download className="size-4" /> Applications CSV</a></Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Students by grade</CardTitle></CardHeader>
          <CardContent><SimpleBarChart data={gradeData} valueLabel="Students" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Application status distribution</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? <SimpleBarChart data={statusData} valueLabel="Applications" /> : <p className="text-sm text-muted-foreground">No applications yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
