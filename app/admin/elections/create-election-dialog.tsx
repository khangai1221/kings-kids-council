"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createElection } from "@/actions/elections";
import type { GradeLevelRow } from "@/types/database";

export function CreateElectionDialog({ gradeLevels }: { gradeLevels: GradeLevelRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [grades, setGrades] = useState<string[]>([]);
  const [positions, setPositions] = useState([{ title: "President", maxChoices: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !opensAt || !closesAt || positions.length === 0) {
      toast.error("Fill in the title, dates, and at least one position.");
      return;
    }
    setIsSubmitting(true);
    const result = await createElection({
      title,
      eligibleGradeLevelIds: grades,
      opensAt: new Date(opensAt).toISOString(),
      closesAt: new Date(closesAt).toISOString(),
      positions,
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    router.push(`/admin/elections/${result.data.electionId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="size-4" /> New election</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Create election</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Opens</Label><Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Closes</Label><Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Eligible grades</Label>
            <div className="flex flex-wrap gap-2">
              {gradeLevels.map((g) => {
                const active = grades.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGrades((prev) => (active ? prev.filter((id) => id !== g.id) : [...prev, g.id]))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"}`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Positions</Label>
            {positions.map((position, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={position.title}
                  onChange={(e) => setPositions((prev) => prev.map((p, i) => (i === index ? { ...p, title: e.target.value } : p)))}
                />
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={position.maxChoices}
                  onChange={(e) => setPositions((prev) => prev.map((p, i) => (i === index ? { ...p, maxChoices: Number(e.target.value) } : p)))}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => setPositions((prev) => prev.filter((_, i) => i !== index))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setPositions((prev) => [...prev, { title: "", maxChoices: 1 }])}>
              <Plus className="size-3.5" /> Add position
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
