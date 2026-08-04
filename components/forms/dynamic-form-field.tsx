"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Paperclip, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnswerValue, FileAnswerValue, HydratedQuestion } from "@/lib/forms/types";

export interface DynamicFormFieldProps {
  question: HydratedQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  error?: string;
  readOnly?: boolean;
  fileUploadHandler?: (file: File, question: HydratedQuestion) => Promise<FileAnswerValue | null>;
}

export function DynamicFormField({ question, value, onChange, error, readOnly, fileUploadHandler }: DynamicFormFieldProps) {
  const fieldId = `field-${question.key}`;
  const helpId = question.help_text ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  if (question.type === "section_heading") {
    return (
      <div className="border-b border-border pb-2 pt-4 first:pt-0">
        <h2 className="text-lg font-semibold text-foreground">{question.label}</h2>
        {question.description ? <p className="mt-1 text-sm text-muted-foreground">{question.description}</p> : null}
      </div>
    );
  }

  if (question.type === "information_block") {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
        <p className="font-medium">{question.label}</p>
        {question.description ? <p className="mt-1 text-muted-foreground">{question.description}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId} className={cn(question.is_required && "after:ml-0.5 after:text-destructive after:content-['*']")}>
        {question.label}
      </Label>
      {question.description ? (
        <p className="text-xs text-muted-foreground">{question.description}</p>
      ) : null}

      <FieldControl
        fieldId={fieldId}
        question={question}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        ariaDescribedBy={[helpId, errorId].filter(Boolean).join(" ") || undefined}
        fileUploadHandler={fileUploadHandler}
      />

      {question.help_text ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {question.help_text}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FieldControl({
  fieldId,
  question,
  value,
  onChange,
  readOnly,
  ariaDescribedBy,
  fileUploadHandler,
}: {
  fieldId: string;
  question: HydratedQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  readOnly?: boolean;
  ariaDescribedBy?: string;
  fileUploadHandler?: (file: File, question: HydratedQuestion) => Promise<FileAnswerValue | null>;
}) {
  switch (question.type) {
    case "short_text":
    case "email":
      return (
        <Input
          id={fieldId}
          type={question.type === "email" ? "email" : "text"}
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={readOnly}
          aria-describedby={ariaDescribedBy}
          maxLength={question.max_length ?? undefined}
        />
      );

    case "long_text":
      return (
        <Textarea
          id={fieldId}
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={readOnly}
          aria-describedby={ariaDescribedBy}
          maxLength={question.max_length ?? undefined}
          rows={5}
        />
      );

    case "number":
      return (
        <Input
          id={fieldId}
          type="number"
          inputMode="numeric"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
          disabled={readOnly}
          aria-describedby={ariaDescribedBy}
          min={question.min_number ?? undefined}
          max={question.max_number ?? undefined}
        />
      );

    case "date":
      return (
        <Input
          id={fieldId}
          type="date"
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={readOnly}
          aria-describedby={ariaDescribedBy}
        />
      );

    case "single_choice":
      return (
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={onChange}
          disabled={readOnly}
          aria-describedby={ariaDescribedBy}
          className="gap-2"
        >
          {question.options.map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`${fieldId}-${option.id}`} />
              <Label htmlFor={`${fieldId}-${option.id}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "yes_no":
      return (
        <RadioGroup
          value={value === true || value === "true" ? "true" : value === false || value === "false" ? "false" : ""}
          onValueChange={(v) => onChange(v === "true")}
          disabled={readOnly}
          aria-describedby={ariaDescribedBy}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="true" id={`${fieldId}-yes`} />
            <Label htmlFor={`${fieldId}-yes`} className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="false" id={`${fieldId}-no`} />
            <Label htmlFor={`${fieldId}-no`} className="font-normal">No</Label>
          </div>
        </RadioGroup>
      );

    case "dropdown":
      return (
        <Select value={(value as string) ?? ""} onValueChange={onChange} disabled={readOnly}>
          <SelectTrigger id={fieldId} className="w-full" aria-describedby={ariaDescribedBy}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiple_choice": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2" aria-describedby={ariaDescribedBy}>
          {question.options.map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <Checkbox
                id={`${fieldId}-${option.id}`}
                checked={selected.includes(option.value)}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  onChange(checked ? [...selected, option.value] : selected.filter((v) => v !== option.value))
                }
              />
              <Label htmlFor={`${fieldId}-${option.id}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case "agreement":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={fieldId}
            checked={value === true || value === "true"}
            onCheckedChange={onChange}
            disabled={readOnly}
            aria-describedby={ariaDescribedBy}
          />
          <Label htmlFor={fieldId} className="font-normal">
            I agree
          </Label>
        </div>
      );

    case "rating": {
      const scale = question.rating_scale ?? 5;
      const current = typeof value === "number" ? value : null;
      return (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-describedby={ariaDescribedBy} id={fieldId}>
          {Array.from({ length: scale }, (_, index) => index + 1).map((score) => (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={current === score}
              disabled={readOnly}
              onClick={() => onChange(score)}
              className={cn(
                "flex size-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                current === score
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-secondary",
              )}
            >
              {score}
            </button>
          ))}
        </div>
      );
    }

    case "ranking": {
      const order = Array.isArray(value) && value.length > 0 ? (value as string[]) : question.options.map((o) => o.value);
      const labelFor = (v: string) => question.options.find((o) => o.value === v)?.label ?? v;
      function move(index: number, delta: number) {
        const next = [...order];
        const target = index + delta;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
      }
      return (
        <ol className="space-y-1" aria-describedby={ariaDescribedBy} id={fieldId}>
          {order.map((v, index) => (
            <li key={v} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="text-muted-foreground">{index + 1}.</span>
              <span className="flex-1">{labelFor(v)}</span>
              <Button type="button" variant="ghost" size="icon" disabled={readOnly || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${labelFor(v)} up`}>
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" disabled={readOnly || index === order.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${labelFor(v)} down`}>
                <ArrowDown className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
      );
    }

    case "file_upload":
      return (
        <FileUploadControl
          fieldId={fieldId}
          question={question}
          value={value as FileAnswerValue | null}
          onChange={onChange}
          readOnly={readOnly}
          fileUploadHandler={fileUploadHandler}
          ariaDescribedBy={ariaDescribedBy}
        />
      );

    default:
      return null;
  }
}

function FileUploadControl({
  fieldId,
  question,
  value,
  onChange,
  readOnly,
  fileUploadHandler,
  ariaDescribedBy,
}: {
  fieldId: string;
  question: HydratedQuestion;
  value: FileAnswerValue | null;
  onChange: (value: AnswerValue) => void;
  readOnly?: boolean;
  fileUploadHandler?: (file: File, question: HydratedQuestion) => Promise<FileAnswerValue | null>;
  ariaDescribedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !fileUploadHandler) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const result = await fileUploadHandler(file, question);
      if (result) onChange(result);
      else setUploadError("Upload failed. Check the file type and size, then try again.");
    } finally {
      setIsUploading(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm" id={fieldId}>
        <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 truncate">{value.filename}</span>
        {!readOnly ? (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Remove file">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={fieldId}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        disabled={readOnly || isUploading}
        accept={question.allowed_file_types?.map((type) => `.${type}`).join(",")}
        aria-describedby={ariaDescribedBy}
      />
      <Button type="button" variant="outline" size="sm" disabled={readOnly || isUploading} onClick={() => inputRef.current?.click()} className="gap-2">
        {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
        {isUploading ? "Uploading…" : "Choose file"}
      </Button>
      {question.allowed_file_types?.length ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Allowed: {question.allowed_file_types.join(", ")}
          {question.max_file_size_bytes ? ` · max ${Math.round(question.max_file_size_bytes / 1024 / 1024)}MB` : ""}
        </p>
      ) : null}
      {uploadError ? <p className="mt-1 text-xs font-medium text-destructive">{uploadError}</p> : null}
    </div>
  );
}
