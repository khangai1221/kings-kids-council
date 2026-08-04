"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/actions/notifications";

export function MarkAllReadButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await markAllNotificationsRead();
        router.refresh();
      }}
    >
      Mark all as read
    </Button>
  );
}
