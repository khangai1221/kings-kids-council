import { getVisibleQuestions } from "@/lib/forms/conditions";
import { isAnswerableQuestion, type AnswerValue, type AnswersByQuestionKey, type HydratedQuestion } from "@/lib/forms/types";

export interface ValidationIssue {
  questionKey: string;
  message: string;
}

export interface ValidateAnswersParams {
  questions: HydratedQuestion[];
  answers: AnswersByQuestionKey;
  studentGradeLevelId?: string | null;
  positionId?: string | null;
}

function isAnsweredValue(value: AnswerValue): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Filters questions down to those actually applicable to this student/
 * position (grade eligibility + position-specific visibility), independent
 * of conditional-visibility (see lib/forms/conditions.ts).
 */
export function getApplicableQuestions(
  questions: HydratedQuestion[],
  studentGradeLevelId?: string | null,
  positionId?: string | null,
): HydratedQuestion[] {
  return questions.filter((question) => {
    if (question.eligible_grade_level_ids && question.eligible_grade_level_ids.length > 0) {
      if (!studentGradeLevelId || !question.eligible_grade_level_ids.includes(studentGradeLevelId)) return false;
    }
    if (question.visible_for_position_ids && question.visible_for_position_ids.length > 0) {
      if (!positionId || !question.visible_for_position_ids.includes(positionId)) return false;
    }
    return true;
  });
}

/**
 * Server-side answer validation mirroring the client-side form's rules.
 * Never trust client validation alone — this runs again in every server
 * action / RPC-calling code path that accepts form answers.
 */
export function validateAnswers({
  questions,
  answers,
  studentGradeLevelId,
  positionId,
}: ValidateAnswersParams): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const applicable = getApplicableQuestions(questions, studentGradeLevelId, positionId);
  const visible = getVisibleQuestions(applicable, answers).filter((question) => isAnswerableQuestion(question.type));

  for (const question of visible) {
    const value = answers[question.key] ?? null;
    const answered = isAnsweredValue(value);

    if (question.is_required && !answered) {
      issues.push({ questionKey: question.key, message: `"${question.label}" is required.` });
      continue;
    }
    if (!answered) continue;

    switch (question.type) {
      case "short_text":
      case "long_text": {
        const str = String(value);
        if (question.min_length && str.length < question.min_length) {
          issues.push({ questionKey: question.key, message: `"${question.label}" must be at least ${question.min_length} characters.` });
        }
        if (question.max_length && str.length > question.max_length) {
          issues.push({ questionKey: question.key, message: `"${question.label}" must be at most ${question.max_length} characters.` });
        }
        break;
      }
      case "email": {
        if (!EMAIL_PATTERN.test(String(value))) {
          issues.push({ questionKey: question.key, message: `"${question.label}" must be a valid email address.` });
        }
        break;
      }
      case "number": {
        const num = Number(value);
        if (Number.isNaN(num)) {
          issues.push({ questionKey: question.key, message: `"${question.label}" must be a number.` });
        } else {
          if (question.min_number !== null && question.min_number !== undefined && num < question.min_number) {
            issues.push({ questionKey: question.key, message: `"${question.label}" must be at least ${question.min_number}.` });
          }
          if (question.max_number !== null && question.max_number !== undefined && num > question.max_number) {
            issues.push({ questionKey: question.key, message: `"${question.label}" must be at most ${question.max_number}.` });
          }
        }
        break;
      }
      case "rating": {
        const num = Number(value);
        const scale = question.rating_scale ?? 5;
        if (Number.isNaN(num) || num < 1 || num > scale) {
          issues.push({ questionKey: question.key, message: `"${question.label}" must be between 1 and ${scale}.` });
        }
        break;
      }
      case "single_choice":
      case "dropdown": {
        const validValues = new Set(question.options.map((option) => option.value));
        if (typeof value !== "string" || (!validValues.has(value) && !question.choice_allow_other)) {
          issues.push({ questionKey: question.key, message: `"${question.label}" has an invalid selection.` });
        }
        break;
      }
      case "multiple_choice": {
        if (!Array.isArray(value)) {
          issues.push({ questionKey: question.key, message: `"${question.label}" must be a list of selections.` });
          break;
        }
        const validValues = new Set(question.options.map((option) => option.value));
        const hasInvalid = value.some((item) => !validValues.has(item));
        if (hasInvalid && !question.choice_allow_other) {
          issues.push({ questionKey: question.key, message: `"${question.label}" has an invalid selection.` });
        }
        break;
      }
      case "yes_no": {
        if (typeof value !== "boolean" && value !== "true" && value !== "false") {
          issues.push({ questionKey: question.key, message: `"${question.label}" must be answered yes or no.` });
        }
        break;
      }
      case "agreement": {
        if (question.is_required && value !== true && value !== "true") {
          issues.push({ questionKey: question.key, message: `You must agree to "${question.label}".` });
        }
        break;
      }
      case "ranking": {
        if (!Array.isArray(value) || value.length === 0) {
          issues.push({ questionKey: question.key, message: `"${question.label}" must be ranked.` });
        }
        break;
      }
      case "file_upload":
      case "date":
      default:
        break;
    }
  }

  return issues;
}
