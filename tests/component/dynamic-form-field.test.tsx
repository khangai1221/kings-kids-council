import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DynamicFormField } from "@/components/forms/dynamic-form-field";
import type { HydratedQuestion } from "@/lib/forms/types";

function makeQuestion(overrides: Partial<HydratedQuestion> & { id: string; key: string }): HydratedQuestion {
  return {
    form_version_id: "version-1",
    type: "short_text",
    label: "Question",
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
    created_at: "",
    updated_at: "",
    options: [],
    conditions: [],
    ...overrides,
  };
}

describe("DynamicFormField", () => {
  it("renders a visible label for a short_text question and reports changes", async () => {
    const onChange = vi.fn();
    const question = makeQuestion({ id: "q1", key: "motivation", label: "Why do you want to join?", is_required: true });
    render(<DynamicFormField question={question} value={null} onChange={onChange} />);

    expect(screen.getByText("Why do you want to join?")).toBeInTheDocument();
    const input = screen.getByLabelText("Why do you want to join?");
    await userEvent.type(input, "Because");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders an accessible error message linked to the field", () => {
    const question = makeQuestion({ id: "q1", key: "name", label: "Name" });
    render(<DynamicFormField question={question} value={null} onChange={() => {}} error="Name is required." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("renders radio options for single_choice questions", () => {
    const question = makeQuestion({
      id: "q1",
      key: "color",
      type: "single_choice",
      label: "Favorite color",
      options: [
        { id: "o1", question_id: "q1", value: "red", label: "Red", position: 0, is_other_option: false },
        { id: "o2", question_id: "q1", value: "blue", label: "Blue", position: 1, is_other_option: false },
      ],
    });
    render(<DynamicFormField question={question} value={null} onChange={() => {}} />);
    expect(screen.getByLabelText("Red")).toBeInTheDocument();
    expect(screen.getByLabelText("Blue")).toBeInTheDocument();
  });

  it("renders section_heading questions without a form control", () => {
    const question = makeQuestion({ id: "q1", key: "section", type: "section_heading", label: "Part 2" });
    render(<DynamicFormField question={question} value={null} onChange={() => {}} />);
    expect(screen.getByRole("heading", { name: "Part 2" })).toBeInTheDocument();
  });
});
