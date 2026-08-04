"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { revealSuggestionIdentity } from "@/actions/suggestions";

export function RevealIdentityButton({ suggestionId }: { suggestionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [identity, setIdentity] = useState<{ displayName: string | null; schoolEmail: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleReveal() {
    setIsPending(true);
    const result = await revealSuggestionIdentity(suggestionId, reason);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setIdentity(result.data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1.5"><Eye className="size-4" /> Reveal identity</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reveal anonymous identity</DialogTitle></DialogHeader>
        {identity ? (
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium text-foreground">{identity.displayName}</p>
            <p className="text-muted-foreground">{identity.schoolEmail}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="reveal-reason">Reason (required, logged in the audit trail)</Label>
            <Input id="reveal-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          {!identity ? <Button onClick={handleReveal} disabled={isPending || !reason.trim()}>{isPending ? "Revealing…" : "Reveal"}</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
