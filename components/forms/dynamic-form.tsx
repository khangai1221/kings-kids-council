"use client";

import { useState } from "react";
import { getVisibleQuestions } from "@/lib/forms/conditions";
import { getApplicableQuestions, validateAnswers } from "@/lib/forms/validate-answers";
import { isAnswerableQuestion, type AnswersByQuestionKey, type FileAnswerValue, type HydratedQuestion } from "@/lib/forms/types";
import { DynamicFormField } from "@/components/forms/dynamic-form-field";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface DynamicFormProps {
  questions: HydratedQuestion[];
  initialAnswers?: AnswersByQuestionKey;
  studentGradeLevelId?: string | null;
  positionId?: string | null;
  onAnswersChange?: (answers: AnswersByQuestionKey) => void;
  onSubmit?: (answers: AnswersByQuestionKey) => Promise<void> | void;
  submitLabel?: string;
  readOnly?: boolean;
  showProgress?: boolean;
  fileUploadHandler?: (file: File, question: HydratedQuestion) => Promise<FileAnswerValue | null>;
}

export function computeCompletionPercent(
  questions: HydratedQuestion[],
  answers: AnswersByQuestionKey,
  gradeId?: string | null,
  positionId?: string | null,
): number {
  const applicable = getApplicableQuestions(questions, gradeId, positionId).filter((q) => isAnswerableQuestion(q.type));
  const visible = getVisibleQuestions(applicable, answers);
  if (visible.length === 0) return 100;
  const answeredCount = visible.filter((question) => {
    const value = answers[question.key];
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }).length;
  return Math.round((answeredCount / visible.length) * 100);
}

export function DynamicForm({
  questions,
  initialAnswers,
  studentGradeLevelId,
  positionId,
  onAnswersChange,
  onSubmit,
  submitLabel = "Submit",
  readOnly,
  showProgress,
  fileUploadHandler,
}: DynamicFormProps) {
  const [answers, setAnswers] = useState<AnswersByQuestionKey>(initialAnswers ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applicable = getApplicableQuestions(questions, studentGradeLevelId, positionId);
  const visible = getVisibleQuestions(applicable, answers);
  const completion = computeCompletionPercent(questions, answers, studentGradeLevelId, positionId);

  function updateAnswer(key: string, value: AnswersByQuestionKey[string]) {
    setAnswers((previous) => {
      const next = { ...previous, [key]: value };
      onAnswersChange?.(next);
      return next;
    });
    setErrors((previous) => {
      if (!(key in previous)) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!onSubmit) return;

    const issues = validateAnswers({ questions, answers, studentGradeLevelId, positionId });
    if (issues.length > 0) {
      setErrors(Object.fromEntries(issues.map((issue) => [issue.questionKey, issue.message])));
      const firstField = document.getElementById(`field-${issues[0].questionKey}`);
      firstField?.focus();
      firstField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(answers);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {showProgress ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Completion</span>
            <span>{completion}%</span>
          </div>
          <Progress value={completion} aria-label={`Form ${completion}% complete`} />
        </div>
      ) : null}

      {visible.map((question) => (
        <DynamicFormField
          key={question.id}
          question={question}
          value={answers[question.key] ?? null}
          onChange={(value) => updateAnswer(question.key, value)}
          error={errors[question.key]}
          readOnly={readOnly}
          fileUploadHandler={fileUploadHandler}
        />
      ))}

      {!readOnly && onSubmit ? (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : submitLabel}
        </Button>
      ) : null}
    </form>
  );
}
