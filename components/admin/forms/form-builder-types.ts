import type { QuestionType } from "@/lib/constants";

export interface BuilderOption {
  value: string;
  label: string;
  isOtherOption: boolean;
}

export interface BuilderCondition {
  dependsOnQuestionKey: string;
  operator: "equals" | "not_equals" | "contains" | "one_of" | "answered" | "not_answered";
  comparisonValue: string;
}

export interface BuilderQuestion {
  uiId: string;
  key: string;
  type: QuestionType;
  label: string;
  description: string;
  placeholder: string;
  helpText: string;
  isRequired: boolean;
  minLength: number | null;
  maxLength: number | null;
  minNumber: number | null;
  maxNumber: number | null;
  ratingScale: number | null;
  allowedFileTypes: string[];
  maxFileSizeBytes: number | null;
  choiceAllowOther: boolean;
  adminNotes: string;
  eligibleGradeLevelIds: string[];
  visibleForPositionIds: string[];
  options: BuilderOption[];
  conditions: BuilderCondition[];
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  number: "Number",
  date: "Date",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  dropdown: "Dropdown",
  yes_no: "Yes / No",
  rating: "Rating",
  ranking: "Ranking",
  agreement: "Agreement",
  file_upload: "File upload",
  section_heading: "Section heading",
  information_block: "Information block",
};

export const QUESTION_TYPES_NEEDING_OPTIONS: QuestionType[] = ["single_choice", "multiple_choice", "dropdown", "ranking"];

let counter = 0;
export function createUiId(): string {
  counter += 1;
  return `new-${Date.now()}-${counter}`;
}

export function createBlankQuestion(type: QuestionType, position: number): BuilderQuestion {
  return {
    uiId: createUiId(),
    key: `question_${position + 1}`,
    type,
    label: type === "section_heading" ? "Section title" : type === "information_block" ? "Information" : "New question",
    description: "",
    placeholder: "",
    helpText: "",
    isRequired: false,
    minLength: null,
    maxLength: null,
    minNumber: null,
    maxNumber: null,
    ratingScale: type === "rating" ? 5 : null,
    allowedFileTypes: type === "file_upload" ? ["pdf", "doc", "docx"] : [],
    maxFileSizeBytes: type === "file_upload" ? 10485760 : null,
    choiceAllowOther: false,
    adminNotes: "",
    eligibleGradeLevelIds: [],
    visibleForPositionIds: [],
    options: QUESTION_TYPES_NEEDING_OPTIONS.includes(type)
      ? [
          { value: "option_1", label: "Option 1", isOtherOption: false },
          { value: "option_2", label: "Option 2", isOtherOption: false },
        ]
      : [],
    conditions: [],
  };
}
