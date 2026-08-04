"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { duplicateFormAsNewDraft, archiveForm } from "@/actions/forms";

export function FormVersionActions({ formId }: { formId: string }) {
  const router = useRouter();

  async function handleDuplicate() {
    const result = await duplicateFormAsNewDraft(formId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("New draft version created.");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDuplicate}>
        <Copy className="size-4" /> Duplicate as new draft
      </Button>
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Archive className="size-4" /> Archive
          </Button>
        }
        title="Archive this form?"
        description="Archived forms are hidden from new campaigns but existing submissions are preserved."
        confirmLabel="Archive"
        destructive
        onConfirm={async () => {
          const result = await archiveForm(formId);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success("Form archived.");
          router.push("/admin/forms");
        }}
      />
    </div>
  );
}
