"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseClient } from "@/lib/supabase/client";

export function NotificationBell({ userId, initialUnreadCount }: { userId: string; initialUnreadCount: number }) {
  const supabase = useSupabaseClient();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [syncedCount, setSyncedCount] = useState(initialUnreadCount);
  if (initialUnreadCount !== syncedCount) {
    setSyncedCount(initialUnreadCount);
    setUnreadCount(initialUnreadCount);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setUnreadCount((count) => count + 1),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const isRead = (payload.new as { is_read: boolean }).is_read;
          const wasRead = (payload.old as { is_read: boolean }).is_read;
          if (isRead && !wasRead) setUnreadCount((count) => Math.max(0, count - 1));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href="/notifications" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}>
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
