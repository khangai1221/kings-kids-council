import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydrateFormVersion } from "@/lib/forms/hydrate";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { SurveyStatusSelect } from "@/app/admin/surveys/[surveyId]/survey-status-select";
import { Users } from "lucide-react";

export default async function AdminSurveyDetailPage({ params }: { params: Promise<{ surveyId: string }> }) {
  await requireCapability("surveys.manage");
  const { surveyId } = await params;
  const supabase = createSupabaseServerClient();

  const { data: survey } = await supabase.from("surveys").select("*").eq("id", surveyId).maybeSingle();
  if (!survey) notFound();

  const hydrated = survey.form_version_id ? await hydrateFormVersion(survey.form_version_id) : null;
  const { data: responses } = await supabase.from("survey_responses").select("id").eq("survey_id", surveyId);
  const responseIds = (responses ?? []).map((r) => r.id);
  const { data: answers } = responseIds.length > 0
    ? await supabase.from("survey_answers").select("question_id, value_json").in("response_id", responseIds)
    : { data: [] };

  const answersByQuestion = new Map<string, { value_json: unknown }[]>();
  for (const answer of answers ?? []) {
    const list = answersByQuestion.get(answer.question_id) ?? [];
    list.push(answer);
    answersByQuestion.set(answer.question_id, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={survey.title} actions={<SurveyStatusSelect surveyId={survey.id} status={survey.status} />} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total responses" value={responses?.length ?? 0} icon={Users} />
        <StatCard label="Mode" value={survey.mode.replace(/_/g, " ")} />
      </div>

      <div className="space-y-4">
        {(hydrated?.questions ?? [])
          .filter((q) => q.type !== "section_heading" && q.type !== "information_block")
          .map((question) => {
            const questionAnswers = answersByQuestion.get(question.id) ?? [];
            const isChoice = ["single_choice", "multiple_choice", "dropdown", "yes_no"].includes(question.type);
            const tally = new Map<string, number>();
            if (isChoice) {
              for (const answer of questionAnswers) {
                const value = answer.value_json;
                const values = Array.isArray(value) ? value : [value];
                for (const v of values) {
                  const key = String(v);
                  tally.set(key, (tally.get(key) ?? 0) + 1);
                }
              }
            }
            const avgRating =
              question.type === "rating" && questionAnswers.length > 0
                ? (questionAnswers.reduce((sum, a) => sum + Number(a.value_json ?? 0), 0) / questionAnswers.length).toFixed(1)
                : null;

            return (
              <Card key={question.id}>
                <CardContent className="p-4">
                  <p className="mb-2 font-medium text-foreground">{question.label}</p>
                  <p className="mb-2 text-xs text-muted-foreground">{questionAnswers.length} response(s)</p>
                  {avgRating ? <p className="text-sm">Average rating: {avgRating} / {question.rating_scale ?? 5}</p> : null}
                  {isChoice && tally.size > 0 ? (
                    <div className="space-y-1.5">
                      {Array.from(tally.entries()).map(([value, count]) => {
                        const percent = Math.round((count / questionAnswers.length) * 100);
                        const label = question.options.find((o) => o.value === value)?.label ?? value;
                        return (
                          <div key={value} className="flex items-center gap-2 text-sm">
                            <span className="w-32 truncate">{label}</span>
                            <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
                            <span className="w-14 text-right text-xs text-muted-foreground">{percent}%</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
