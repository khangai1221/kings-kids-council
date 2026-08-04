"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { addPosition, deletePosition } from "@/actions/admin-applications";
import type { ApplicationPositionRow } from "@/types/database";

export function PositionManager({ campaignId, positions }: { campaignId: string; positions: ApplicationPositionRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    if (!title.trim()) return;
    setIsSubmitting(true);
    const result = await addPosition(campaignId, { title, requiresInterview: false });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setTitle("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {positions.map((position) => (
        <Card key={position.id}>
          <CardContent className="flex items-center justify-between p-3">
            <span className="font-medium text-foreground">{position.title}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                const result = await deletePosition(campaignId, position.id);
                if (!result.success) toast.error(result.error);
                else router.refresh();
              }}
              aria-label={`Remove ${position.title}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Input placeholder="New position title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button onClick={handleAdd} disabled={isSubmitting} className="gap-1.5 shrink-0">
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </div>
  );
}
