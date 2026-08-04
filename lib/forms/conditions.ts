import type { Json } from "@/types/database";
import type { AnswerValue, AnswersByQuestionKey, HydratedQuestion } from "@/lib/forms/types";

type ConditionOperator = "equals" | "not_equals" | "contains" | "one_of" | "answered" | "not_answered";

function stringifyValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function isAnswered(value: AnswerValue): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function evaluateOperator(operator: ConditionOperator, value: AnswerValue, comparisonValue: Json): boolean {
  switch (operator) {
    case "answered":
      return isAnswered(value);
    case "not_answered":
      return !isAnswered(value);
    case "equals":
      return stringifyValue(value) === stringifyValue(comparisonValue);
    case "not_equals":
      return stringifyValue(value) !== stringifyValue(comparisonValue);
    case "contains":
      if (Array.isArray(value)) return value.some((item) => stringifyValue(item) === stringifyValue(comparisonValue));
      return typeof value === "string" && typeof comparisonValue === "string" && value.includes(comparisonValue);
    case "one_of": {
      const list = Array.isArray(comparisonValue) ? comparisonValue : [];
      return list.some((item) => stringifyValue(item) === stringifyValue(value));
    }
    default:
      return true;
  }
}

/**
 * Pure conditional-visibility evaluator. Multiple conditions on the same
 * question are AND'd together. Dependency lookups go through the question's
 * `key` (the react-hook-form field name), not its database id.
 */
export function isQuestionVisible(
  question: HydratedQuestion,
  allQuestions: HydratedQuestion[],
  answers: AnswersByQuestionKey,
): boolean {
  if (question.conditions.length === 0) return true;

  const questionById = new Map(allQuestions.map((q) => [q.id, q]));

  return question.conditions.every((condition) => {
    const dependsOn = questionById.get(condition.depends_on_question_id);
    if (!dependsOn) return true;
    const value = answers[dependsOn.key] ?? null;
    return evaluateOperator(condition.operator as ConditionOperator, value, condition.comparison_value);
  });
}

export function getVisibleQuestions(questions: HydratedQuestion[], answers: AnswersByQuestionKey): HydratedQuestion[] {
  return questions.filter((question) => isQuestionVisible(question, questions, answers));
}
