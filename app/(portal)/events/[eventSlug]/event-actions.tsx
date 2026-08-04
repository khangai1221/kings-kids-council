"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { registerForEvent, cancelEventRegistration, toggleSavedEvent } from "@/actions/events";

interface EventActionsProps {
  eventId: string;
  eventSlug: string;
  canRegister: boolean;
  registration: { id: string; status: string } | null;
  isSaved: boolean;
}

export function EventActions({ eventId, eventSlug, canRegister, registration, isSaved }: EventActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [saved, setSaved] = useState(isSaved);

  async function handleRegister() {
    setIsPending(true);
    const result = await registerForEvent(eventId);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.data.status === "waitlisted" ? `You're on the waitlist (position ${result.data.waitlistPosition}).` : "You're registered!");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {registration ? (
        <ConfirmDialog
          trigger={<Button variant="outline">{registration.status === "waitlisted" ? "Leave waitlist" : "Cancel registration"}</Button>}
          title="Cancel your registration?"
          description="If someone is on the waitlist, they will be promoted automatically."
          destructive
          onConfirm={async () => {
            const result = await cancelEventRegistration(registration.id);
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            toast.success("Registration cancelled.");
            router.refresh();
          }}
        />
      ) : canRegister ? (
        <Button onClick={handleRegister} disabled={isPending}>{isPending ? "Registering…" : "Register"}</Button>
      ) : null}

      <Button
        variant="outline"
        className="gap-1.5"
        onClick={async () => {
          setSaved((v) => !v);
          const result = await toggleSavedEvent(eventId, !saved);
          if (!result.success) toast.error(result.error);
        }}
      >
        {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        {saved ? "Saved" : "Save"}
      </Button>

      <Button variant="outline" className="gap-1.5" asChild>
        <a href={`/api/events/${eventSlug}/ics`} download>
          <Download className="size-4" /> Add to calendar
        </a>
      </Button>
    </div>
  );
}
