"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DynamicForm } from "@/components/forms/dynamic-form";
import { submitSurveyResponse } from "@/actions/surveys";
import type { AnswersByQuestionKey, HydratedQuestion } from "@/lib/forms/types";

export function SurveyResponseForm({ surveyId, questions, thankYouMessage }: { surveyId: string; questions: HydratedQuestion[]; thankYouMessage?: string | null }) {
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(answers: AnswersByQuestionKey) {
    const result = await submitSurveyResponse(surveyId, answers);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center text-success">
        {thankYouMessage || "Thank you for your response!"}
      </div>
    );
  }

  return <DynamicForm questions={questions} onSubmit={handleSubmit} submitLabel="Submit response" showProgress />;
}
