"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { markNotificationRead } from "@/actions/notifications";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/types/database";

export function NotificationItem({ notification }: { notification: NotificationRow }) {
  const router = useRouter();

  const content = (
    <div className={cn("rounded-lg border p-4", notification.is_read ? "border-border" : "border-primary/30 bg-primary/5")}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-foreground">{notification.title}</p>
        {!notification.is_read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
      <p className="mt-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>
    </div>
  );

  async function handleClick() {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
      router.refresh();
    }
  }

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="block w-full text-left">
      {content}
    </button>
  );
}
