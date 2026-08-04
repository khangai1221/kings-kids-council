import type { QuestionType } from "@/lib/constants";
import type { FormConditionRow, FormQuestionOptionRow, FormQuestionRow } from "@/types/database";

/** A form question "hydrated" with its options and the conditions that gate its visibility. */
export interface HydratedQuestion extends FormQuestionRow {
  options: FormQuestionOptionRow[];
  conditions: FormConditionRow[];
}

export interface HydratedFormVersion {
  formVersionId: string;
  formTitle: string;
  questions: HydratedQuestion[];
}

export interface FileAnswerValue {
  fileRecordId: string;
  filename: string;
}

/** Answer value shapes the renderer/validator understand, keyed by question type. */
export type AnswerValue = string | number | boolean | string[] | FileAnswerValue | null;

export type AnswersByQuestionKey = Record<string, AnswerValue>;

export const QUESTION_TYPES_WITH_OPTIONS: readonly QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "dropdown",
  "ranking",
];

export const NON_ANSWERABLE_QUESTION_TYPES: readonly QuestionType[] = ["section_heading", "information_block"];

export function isAnswerableQuestion(type: QuestionType): boolean {
  return !NON_ANSWERABLE_QUESTION_TYPES.includes(type);
}
