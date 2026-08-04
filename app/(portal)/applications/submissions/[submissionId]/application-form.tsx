"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DynamicForm } from "@/components/forms/dynamic-form";
import { saveApplicationAnswers, submitApplication, uploadApplicationFile } from "@/actions/applications";
import type { AnswersByQuestionKey, FileAnswerValue, HydratedQuestion } from "@/lib/forms/types";

interface ApplicationFormProps {
  submissionId: string;
  questions: HydratedQuestion[];
  initialAnswers: AnswersByQuestionKey;
  gradeLevelId: string | null;
  positionId: string;
}

export function ApplicationForm({ submissionId, questions, initialAnswers, gradeLevelId, positionId }: ApplicationFormProps) {
  const router = useRouter();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleAnswersChange(answers: AnswersByQuestionKey) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await saveApplicationAnswers(submissionId, answers);
      if (result.success) setSavedAt(new Date());
    }, 900);
  }

  async function handleFileUpload(file: File): Promise<FileAnswerValue | null> {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadApplicationFile(formData);
    if (!result.success) {
      toast.error(result.error);
      return null;
    }
    return result.data;
  }

  async function handleSubmit(answers: AnswersByQuestionKey) {
    await saveApplicationAnswers(submissionId, answers);
    const result = await submitApplication(submissionId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Application submitted!");
    router.refresh();
  }

  return (
    <div>
      <DynamicForm
        questions={questions}
        initialAnswers={initialAnswers}
        studentGradeLevelId={gradeLevelId}
        positionId={positionId}
        onAnswersChange={handleAnswersChange}
        onSubmit={handleSubmit}
        submitLabel="Submit application"
        showProgress
        fileUploadHandler={handleFileUpload}
      />
      {savedAt ? (
        <p className="mt-3 text-xs text-muted-foreground">Draft saved at {savedAt.toLocaleTimeString()}</p>
      ) : null}
    </div>
  );
}
