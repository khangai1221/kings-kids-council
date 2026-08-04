"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPES_NEEDING_OPTIONS, type BuilderQuestion } from "@/components/admin/forms/form-builder-types";
import type { GradeLevelRow } from "@/types/database";

interface FormQuestionEditorProps {
  question: BuilderQuestion;
  allQuestions: BuilderQuestion[];
  gradeLevels: GradeLevelRow[];
  onChange: (patch: Partial<BuilderQuestion>) => void;
}

const NUMBER_TYPES = new Set(["number"]);
const TEXT_LENGTH_TYPES = new Set(["short_text", "long_text"]);

export function FormQuestionEditor({ question, allQuestions, gradeLevels, onChange }: FormQuestionEditorProps) {
  const needsOptions = QUESTION_TYPES_NEEDING_OPTIONS.includes(question.type);
  const otherQuestions = allQuestions.filter((q) => q.uiId !== question.uiId && q.key);

  return (
    <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Label</Label>
        <Input value={question.label} onChange={(e) => onChange({ label: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Internal key</Label>
        <Input
          value={question.key}
          onChange={(e) => onChange({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Description (shown to students)</Label>
        <Textarea value={question.description} onChange={(e) => onChange({ description: e.target.value })} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>Placeholder</Label>
        <Input value={question.placeholder} onChange={(e) => onChange({ placeholder: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Help text</Label>
        <Input value={question.helpText} onChange={(e) => onChange({ helpText: e.target.value })} />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
        <Label className="font-normal">Required</Label>
        <Switch checked={question.isRequired} onCheckedChange={(v) => onChange({ isRequired: v })} />
      </div>

      {TEXT_LENGTH_TYPES.has(question.type) ? (
        <>
          <div className="space-y-1.5">
            <Label>Min length</Label>
            <Input
              type="number"
              value={question.minLength ?? ""}
              onChange={(e) => onChange({ minLength: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max length</Label>
            <Input
              type="number"
              value={question.maxLength ?? ""}
              onChange={(e) => onChange({ maxLength: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </>
      ) : null}

      {NUMBER_TYPES.has(question.type) ? (
        <>
          <div className="space-y-1.5">
            <Label>Min number</Label>
            <Input
              type="number"
              value={question.minNumber ?? ""}
              onChange={(e) => onChange({ minNumber: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max number</Label>
            <Input
              type="number"
              value={question.maxNumber ?? ""}
              onChange={(e) => onChange({ maxNumber: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </>
      ) : null}

      {question.type === "rating" ? (
        <div className="space-y-1.5">
          <Label>Rating scale (max)</Label>
          <Input
            type="number"
            min={2}
            max={10}
            value={question.ratingScale ?? 5}
            onChange={(e) => onChange({ ratingScale: Number(e.target.value) })}
          />
        </div>
      ) : null}

      {question.type === "file_upload" ? (
        <>
          <div className="space-y-1.5">
            <Label>Allowed file types (comma separated)</Label>
            <Input
              value={question.allowedFileTypes.join(", ")}
              onChange={(e) =>
                onChange({ allowedFileTypes: e.target.value.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max file size (MB)</Label>
            <Input
              type="number"
              value={question.maxFileSizeBytes ? Math.round(question.maxFileSizeBytes / 1024 / 1024) : ""}
              onChange={(e) => onChange({ maxFileSizeBytes: e.target.value ? Number(e.target.value) * 1024 * 1024 : null })}
            />
          </div>
        </>
      ) : null}

      {needsOptions ? (
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Choice options</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() =>
                onChange({
                  options: [
                    ...question.options,
                    { value: `option_${question.options.length + 1}`, label: `Option ${question.options.length + 1}`, isOtherOption: false },
                  ],
                })
              }
            >
              <Plus className="size-3.5" /> Add option
            </Button>
          </div>
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option.label}
                  placeholder="Label shown to students"
                  onChange={(e) => {
                    const next = [...question.options];
                    next[index] = { ...option, label: e.target.value, value: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_") };
                    onChange({ options: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove option"
                  onClick={() => onChange({ options: question.options.filter((_, i) => i !== index) })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5 sm:col-span-2">
        <Label>Grade eligibility (leave empty for all grades)</Label>
        <div className="flex flex-wrap gap-2">
          {gradeLevels.map((grade) => {
            const active = question.eligibleGradeLevelIds.includes(grade.id);
            return (
              <button
                key={grade.id}
                type="button"
                onClick={() =>
                  onChange({
                    eligibleGradeLevelIds: active
                      ? question.eligibleGradeLevelIds.filter((id) => id !== grade.id)
                      : [...question.eligibleGradeLevelIds, grade.id],
                  })
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"}`}
              >
                {grade.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label>Conditional visibility</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={otherQuestions.length === 0}
            onClick={() =>
              onChange({
                conditions: [
                  ...question.conditions,
                  { dependsOnQuestionKey: otherQuestions[0]?.key ?? "", operator: "equals", comparisonValue: "" },
                ],
              })
            }
          >
            <Plus className="size-3.5" /> Add rule
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Only show this question when all rules below are true.</p>
        {question.conditions.map((condition, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
            <span className="text-xs text-muted-foreground">Show if</span>
            <Select
              value={condition.dependsOnQuestionKey}
              onValueChange={(value) => {
                const next = [...question.conditions];
                next[index] = { ...condition, dependsOnQuestionKey: value };
                onChange({ conditions: next });
              }}
            >
              <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Question" /></SelectTrigger>
              <SelectContent>
                {otherQuestions.map((q) => (
                  <SelectItem key={q.uiId} value={q.key}>{q.label || q.key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={condition.operator}
              onValueChange={(value) => {
                const next = [...question.conditions];
                next[index] = { ...condition, operator: value as typeof condition.operator };
                onChange({ conditions: next });
              }}
            >
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">equals</SelectItem>
                <SelectItem value="not_equals">not equals</SelectItem>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="one_of">one of</SelectItem>
                <SelectItem value="answered">answered</SelectItem>
                <SelectItem value="not_answered">not answered</SelectItem>
              </SelectContent>
            </Select>
            {condition.operator !== "answered" && condition.operator !== "not_answered" ? (
              <Input
                className="h-8 w-32"
                value={condition.comparisonValue}
                placeholder="value"
                onChange={(e) => {
                  const next = [...question.conditions];
                  next[index] = { ...condition, comparisonValue: e.target.value };
                  onChange({ conditions: next });
                }}
              />
            ) : null}
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange({ conditions: question.conditions.filter((_, i) => i !== index) })}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>Admin-only notes</Label>
        <Textarea value={question.adminNotes} onChange={(e) => onChange({ adminNotes: e.target.value })} rows={2} />
      </div>
    </div>
  );
}
