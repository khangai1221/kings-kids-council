"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveFormVersionQuestions, publishFormVersion } from "@/actions/forms";
import { FormQuestionEditor } from "@/components/admin/forms/form-question-editor";
import {
  QUESTION_TYPE_LABELS,
  createBlankQuestion,
  type BuilderQuestion,
} from "@/components/admin/forms/form-builder-types";
import type { QuestionType } from "@/lib/constants";
import type { GradeLevelRow } from "@/types/database";
import { cn } from "@/lib/utils";

interface FormBuilderProps {
  formVersionId: string;
  isDraft: boolean;
  initialQuestions: BuilderQuestion[];
  gradeLevels: GradeLevelRow[];
}

export function FormBuilder({ formVersionId, isDraft, initialQuestions, gradeLevels }: FormBuilderProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<BuilderQuestion[]>(initialQuestions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newType, setNewType] = useState<QuestionType>("short_text");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateQuestion(uiId: string, patch: Partial<BuilderQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.uiId === uiId ? { ...q, ...patch } : q)));
  }

  function removeQuestion(uiId: string) {
    setQuestions((prev) => prev.filter((q) => q.uiId !== uiId));
  }

  function addQuestion() {
    const question = createBlankQuestion(newType, questions.length);
    setQuestions((prev) => [...prev, question]);
    setExpandedId(question.uiId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.uiId === active.id);
      const newIndex = prev.findIndex((q) => q.uiId === over.id);
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  }

  async function handleSave() {
    if (!isDraft) {
      toast.error("This version is no longer a draft. Duplicate the form to make changes.");
      return;
    }
    setIsSaving(true);
    const result = await saveFormVersionQuestions({
      formVersionId,
      questions: questions.map((q) => ({
        key: q.key,
        type: q.type,
        label: q.label,
        description: q.description,
        placeholder: q.placeholder,
        helpText: q.helpText,
        isRequired: q.isRequired,
        minLength: q.minLength,
        maxLength: q.maxLength,
        minNumber: q.minNumber,
        maxNumber: q.maxNumber,
        ratingScale: q.ratingScale,
        allowedFileTypes: q.allowedFileTypes,
        maxFileSizeBytes: q.maxFileSizeBytes,
        choiceAllowOther: q.choiceAllowOther,
        adminNotes: q.adminNotes,
        eligibleGradeLevelIds: q.eligibleGradeLevelIds,
        visibleForPositionIds: q.visibleForPositionIds,
        options: q.options,
        conditions: q.conditions,
      })),
    });
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Draft saved.");
    router.refresh();
  }

  async function handlePublish() {
    setIsPublishing(true);
    const result = await publishFormVersion(formVersionId);
    setIsPublishing(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Form published.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {!isDraft ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          This version is {isDraft ? "a draft" : "no longer editable"}. Duplicate the form to make further changes.
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.uiId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {questions.map((question) => (
              <SortableQuestionRow
                key={question.uiId}
                question={question}
                allQuestions={questions}
                gradeLevels={gradeLevels}
                expanded={expandedId === question.uiId}
                disabled={!isDraft}
                onToggle={() => setExpandedId((id) => (id === question.uiId ? null : question.uiId))}
                onChange={(patch) => updateQuestion(question.uiId, patch)}
                onRemove={() => removeQuestion(question.uiId)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isDraft ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
          <Select value={newType} onValueChange={(v) => setNewType(v as QuestionType)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" className="gap-1.5" onClick={addQuestion}>
            <Plus className="size-4" /> Add question
          </Button>
        </div>
      ) : null}

      {isDraft ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save draft"}</Button>
          <Button variant="outline" onClick={handlePublish} disabled={isPublishing || questions.length === 0}>
            {isPublishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SortableQuestionRow({
  question,
  allQuestions,
  gradeLevels,
  expanded,
  disabled,
  onToggle,
  onChange,
  onRemove,
}: {
  question: BuilderQuestion;
  allQuestions: BuilderQuestion[];
  gradeLevels: GradeLevelRow[];
  expanded: boolean;
  disabled: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<BuilderQuestion>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.uiId });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-lg border border-border bg-card", isDragging && "opacity-60")}
    >
      <div className="flex items-center gap-2 p-3">
        {!disabled ? (
          <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground" aria-label="Drag to reorder">
            <GripVertical className="size-4" />
          </button>
        ) : (
          <span className="size-4" />
        )}
        <Badge variant="outline" className="shrink-0 text-xs font-normal">
          {QUESTION_TYPE_LABELS[question.type]}
        </Badge>
        <button type="button" onClick={onToggle} className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-medium text-foreground">
          <span className="truncate">
            {question.label || "Untitled question"}
            {question.isRequired ? <span className="ml-1 text-destructive">*</span> : null}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>
        {!disabled ? (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Delete question">
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
      {expanded ? (
        <div className="px-3 pb-3">
          <FormQuestionEditor question={question} allQuestions={allQuestions} gradeLevels={gradeLevels} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}
