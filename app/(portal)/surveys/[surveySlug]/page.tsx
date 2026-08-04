import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydrateFormVersion } from "@/lib/forms/hydrate";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { SurveyResponseForm } from "@/app/(portal)/surveys/[surveySlug]/survey-response-form";

export default async function SurveyDetailPage({ params }: { params: Promise<{ surveySlug: string }> }) {
  const user = await requireOnboardedUser();
  const { surveySlug } = await params;
  const supabase = createSupabaseServerClient();

  const { data: survey } = await supabase.from("surveys").select("*").eq("slug", surveySlug).maybeSingle();
  if (!survey) notFound();

  let alreadyResponded = false;
  if (survey.mode !== "anonymous" && survey.limit_one_response) {
    const { data } = await supabase
      .from("survey_participation")
      .select("id")
      .eq("survey_id", survey.id)
      .eq("student_id", user.profile.id)
      .maybeSingle();
    alreadyResponded = Boolean(data);
  }

  const hydrated = survey.form_version_id ? await hydrateFormVersion(survey.form_version_id) : null;

  return (
    <div className="max-w-2xl">
      <PageHeader title={survey.title} description={survey.description ?? undefined} actions={<StatusBadge status={survey.status} />} />

      {survey.status !== "open" ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">This survey is not currently open.</CardContent></Card>
      ) : alreadyResponded ? (
        <Card className="border-success/30 bg-success/5"><CardContent className="p-6 text-center text-success">You have already responded to this survey.</CardContent></Card>
      ) : hydrated ? (
        <SurveyResponseForm surveyId={survey.id} questions={hydrated.questions} thankYouMessage={survey.thank_you_message} />
      ) : null}
    </div>
  );
}
