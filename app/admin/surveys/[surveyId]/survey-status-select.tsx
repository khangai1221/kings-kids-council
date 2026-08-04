"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSurveyStatus } from "@/actions/surveys";
import { SURVEY_STATUSES, type SurveyStatus } from "@/lib/constants";

export function SurveyStatusSelect({ surveyId, status }: { surveyId: string; status: SurveyStatus }) {
  const router = useRouter();
  return (
    <Select
      value={status}
      onValueChange={async (value) => {
        const result = await updateSurveyStatus(surveyId, value as SurveyStatus);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        router.refresh();
      }}
    >
      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        {SURVEY_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
