import { describe, expect, it } from "vitest";
import { getVisibleQuestions, isQuestionVisible } from "@/lib/forms/conditions";
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

describe("isQuestionVisible", () => {
  it("is always visible when it has no conditions", () => {
    const question = makeQuestion({ id: "q1", key: "q1" });
    expect(isQuestionVisible(question, [question], {})).toBe(true);
  });

  it("hides a question when its 'equals' condition is not met", () => {
    const trigger = makeQuestion({ id: "q1", key: "wants_interview" });
    const dependent = makeQuestion({
      id: "q2",
      key: "interview_time",
      conditions: [
        { id: "c1", question_id: "q2", depends_on_question_id: "q1", operator: "equals", comparison_value: "yes", created_at: "" },
      ],
    });
    expect(isQuestionVisible(dependent, [trigger, dependent], { wants_interview: "no" })).toBe(false);
    expect(isQuestionVisible(dependent, [trigger, dependent], { wants_interview: "yes" })).toBe(true);
  });

  it("supports the 'answered' operator", () => {
    const trigger = makeQuestion({ id: "q1", key: "essay" });
    const dependent = makeQuestion({
      id: "q2",
      key: "follow_up",
      conditions: [{ id: "c1", question_id: "q2", depends_on_question_id: "q1", operator: "answered", comparison_value: null, created_at: "" }],
    });
    expect(isQuestionVisible(dependent, [trigger, dependent], {})).toBe(false);
    expect(isQuestionVisible(dependent, [trigger, dependent], { essay: "" })).toBe(false);
    expect(isQuestionVisible(dependent, [trigger, dependent], { essay: "some text" })).toBe(true);
  });

  it("supports the 'one_of' operator against an array of allowed values", () => {
    const trigger = makeQuestion({ id: "q1", key: "grade" });
    const dependent = makeQuestion({
      id: "q2",
      key: "senior_question",
      conditions: [
        { id: "c1", question_id: "q2", depends_on_question_id: "q1", operator: "one_of", comparison_value: ["11", "12"], created_at: "" },
      ],
    });
    expect(isQuestionVisible(dependent, [trigger, dependent], { grade: "9" })).toBe(false);
    expect(isQuestionVisible(dependent, [trigger, dependent], { grade: "12" })).toBe(true);
  });

  it("requires ALL conditions to pass (AND semantics)", () => {
    const q1 = makeQuestion({ id: "q1", key: "a" });
    const q2 = makeQuestion({ id: "q2", key: "b" });
    const dependent = makeQuestion({
      id: "q3",
      key: "c",
      conditions: [
        { id: "c1", question_id: "q3", depends_on_question_id: "q1", operator: "equals", comparison_value: "yes", created_at: "" },
        { id: "c2", question_id: "q3", depends_on_question_id: "q2", operator: "equals", comparison_value: "yes", created_at: "" },
      ],
    });
    expect(isQuestionVisible(dependent, [q1, q2, dependent], { a: "yes", b: "no" })).toBe(false);
    expect(isQuestionVisible(dependent, [q1, q2, dependent], { a: "yes", b: "yes" })).toBe(true);
  });
});

describe("getVisibleQuestions", () => {
  it("filters a list down to only the visible questions", () => {
    const trigger = makeQuestion({ id: "q1", key: "trigger" });
    const shown = makeQuestion({ id: "q2", key: "shown" });
    const hidden = makeQuestion({
      id: "q3",
      key: "hidden",
      conditions: [{ id: "c1", question_id: "q3", depends_on_question_id: "q1", operator: "equals", comparison_value: "x", created_at: "" }],
    });
    const visible = getVisibleQuestions([trigger, shown, hidden], { trigger: "not-x" });
    expect(visible.map((q) => q.key)).toEqual(["trigger", "shown"]);
  });
});
