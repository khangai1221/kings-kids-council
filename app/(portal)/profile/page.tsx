import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/app/(portal)/profile/profile-form";
import { ROLE_LABELS } from "@/lib/permissions/roles";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const [{ data: gradeLevels }, { data: schoolClasses }] = await Promise.all([
    supabase.from("grade_levels").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("school_classes").select("*").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div className="max-w-xl">
      <PageHeader title="Profile" description="Your student council portal profile." />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{ROLE_LABELS[user.profile.role]}</Badge>
            <Badge variant="outline" className="capitalize">{user.profile.account_status}</Badge>
          </div>
          <ProfileForm
            schoolEmail={user.profile.school_email}
            defaultDisplayName={user.profile.display_name ?? ""}
            defaultGradeLevelId={user.profile.grade_level_id ?? ""}
            defaultSchoolClassId={user.profile.school_class_id ?? ""}
            defaultGraduationYear={user.profile.graduation_year}
            gradeLevels={gradeLevels ?? []}
            schoolClasses={schoolClasses ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
