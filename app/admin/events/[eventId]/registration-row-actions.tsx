"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { markAttendance, promoteWaitlisted } from "@/actions/events";

export function RegistrationRowActions({
  eventId,
  registrationId,
  status,
  attended,
}: {
  eventId: string;
  registrationId: string;
  status: string;
  attended: boolean;
}) {
  const router = useRouter();

  if (status === "waitlisted") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          const result = await promoteWaitlisted(registrationId, eventId);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success("Promoted to registered.");
          router.refresh();
        }}
      >
        Promote
      </Button>
    );
  }

  if (status === "registered") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={attended}
          onCheckedChange={async (checked) => {
            const result = await markAttendance(registrationId, eventId, Boolean(checked));
            if (!result.success) toast.error(result.error);
            else router.refresh();
          }}
        />
        <span className="text-xs text-muted-foreground">Attended</span>
      </div>
    );
  }

  return null;
}
