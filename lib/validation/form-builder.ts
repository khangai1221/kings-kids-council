import { z } from "zod";
import { QUESTION_TYPES } from "@/lib/constants";

export const formQuestionOptionInputSchema = z.object({
  value: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  isOtherOption: z.boolean().default(false),
});

export const formConditionInputSchema = z.object({
  dependsOnQuestionKey: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "one_of", "answered", "not_answered"]),
  comparisonValue: z.union([z.string(), z.array(z.string())]).nullable().optional(),
});

export const formQuestionInputSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1, "Internal key is required.")
      .max(60)
      .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only."),
    type: z.enum(QUESTION_TYPES),
    label: z.string().trim().min(1, "Label is required.").max(300),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    placeholder: z.string().trim().max(200).optional().or(z.literal("")),
    helpText: z.string().trim().max(500).optional().or(z.literal("")),
    isRequired: z.boolean().default(false),
    minLength: z.coerce.number().int().min(0).max(10000).optional().nullable(),
    maxLength: z.coerce.number().int().min(1).max(10000).optional().nullable(),
    minNumber: z.coerce.number().optional().nullable(),
    maxNumber: z.coerce.number().optional().nullable(),
    ratingScale: z.coerce.number().int().min(2).max(10).optional().nullable(),
    allowedFileTypes: z.array(z.string()).optional(),
    maxFileSizeBytes: z.coerce.number().int().positive().optional().nullable(),
    choiceAllowOther: z.boolean().default(false),
    adminNotes: z.string().trim().max(1000).optional().or(z.literal("")),
    eligibleGradeLevelIds: z.array(z.string().uuid()).optional(),
    visibleForPositionIds: z.array(z.string().uuid()).optional(),
    options: z.array(formQuestionOptionInputSchema).default([]),
    conditions: z.array(formConditionInputSchema).default([]),
  })
  .refine(
    (data) =>
      !["single_choice", "multiple_choice", "dropdown", "ranking"].includes(data.type) || data.options.length > 0,
    { message: "Add at least one option for this question type.", path: ["options"] },
  );

export type FormQuestionInput = z.infer<typeof formQuestionInputSchema>;

export const saveFormVersionQuestionsSchema = z.object({
  formVersionId: z.string().uuid(),
  questions: z.array(formQuestionInputSchema).max(200),
});

export const createFormSchema = z.object({
  kind: z.enum(["application", "survey", "event_registration", "other"]),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});
