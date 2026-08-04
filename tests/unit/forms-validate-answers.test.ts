import { describe, expect, it } from "vitest";
import { validateAnswers, getApplicableQuestions } from "@/lib/forms/validate-answers";
import type { HydratedQuestion } from "@/lib/forms/types";

function makeQuestion(overrides: Partial<HydratedQuestion> & { id: string; key: string }): HydratedQuestion {
  return {
    form_version_id: "version-1",
    type: "short_text",
    label: overrides.key,
    description: null,
    placeholder: null,
    help_text: null,
    is_required: false,
    position: 0,
    min_length: null,
    max_length: null,
    min_number: null,
    max_number: null,
    allowed_file_types: null,
    max_file_size_bytes: null,
    choice_allow_other: false,
    rating_scale: null,
    admin_notes: null,
    eligible_grade_level_ids: null,
    visible_for_position_ids: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    options: [],
    conditions: [],
    ...overrides,
  };
}

describe("validateAnswers", () => {
  it("flags a missing required field", () => {
    const q = makeQuestion({ id: "q1", key: "name", is_required: true, label: "Full name" });
    const issues = validateAnswers({ questions: [q], answers: {} });
    expect(issues).toHaveLength(1);
    expect(issues[0].questionKey).toBe("name");
  });

  it("passes when a required field is answered", () => {
    const q = makeQuestion({ id: "q1", key: "name", is_required: true });
    const issues = validateAnswers({ questions: [q], answers: { name: "Anujin" } });
    expect(issues).toHaveLength(0);
  });

  it("enforces min/max length on text fields", () => {
    const q = makeQuestion({ id: "q1", key: "bio", min_length: 10, max_length: 20 });
    expect(validateAnswers({ questions: [q], answers: { bio: "short" } })).toHaveLength(1);
    expect(validateAnswers({ questions: [q], answers: { bio: "this is long enough and under the limit" } })).toHaveLength(1);
    expect(validateAnswers({ questions: [q], answers: { bio: "just right length" } })).toHaveLength(0);
  });

  it("validates email format", () => {
    const q = makeQuestion({ id: "q1", key: "email", type: "email" });
    expect(validateAnswers({ questions: [q], answers: { email: "not-an-email" } })).toHaveLength(1);
    expect(validateAnswers({ questions: [q], answers: { email: "a@b.com" } })).toHaveLength(0);
  });

  it("enforces number bounds", () => {
    const q = makeQuestion({ id: "q1", key: "age", type: "number", min_number: 10, max_number: 20 });
    expect(validateAnswers({ questions: [q], answers: { age: 5 } })).toHaveLength(1);
    expect(validateAnswers({ questions: [q], answers: { age: 15 } })).toHaveLength(0);
  });

  it("rejects a choice value that is not one of the options", () => {
    const q = makeQuestion({
      id: "q1",
      key: "color",
      type: "single_choice",
      options: [
        { id: "o1", question_id: "q1", value: "red", label: "Red", position: 0, is_other_option: false },
        { id: "o2", question_id: "q1", value: "blue", label: "Blue", position: 1, is_other_option: false },
      ],
    });
    expect(validateAnswers({ questions: [q], answers: { color: "green" } })).toHaveLength(1);
    expect(validateAnswers({ questions: [q], answers: { color: "blue" } })).toHaveLength(0);
  });

  it("does not require a conditionally-hidden required question", () => {
    const trigger = makeQuestion({ id: "q1", key: "wants_interview" });
    const dependent = makeQuestion({
      id: "q2",
      key: "interview_time",
      is_required: true,
      conditions: [{ id: "c1", question_id: "q2", depends_on_question_id: "q1", operator: "equals", comparison_value: "yes", created_at: "" }],
    });
    const issues = validateAnswers({ questions: [trigger, dependent], answers: { wants_interview: "no" } });
    expect(issues).toHaveLength(0);
  });

  it("excludes questions outside the student's grade eligibility", () => {
    const q = makeQuestion({ id: "q1", key: "senior_only", is_required: true, eligible_grade_level_ids: ["grade-12-id"] });
    const applicable = getApplicableQuestions([q], "grade-9-id", null);
    expect(applicable).toHaveLength(0);

    const issues = validateAnswers({ questions: [q], answers: {}, studentGradeLevelId: "grade-9-id" });
    expect(issues).toHaveLength(0);
  });
});
