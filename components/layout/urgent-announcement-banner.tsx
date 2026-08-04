"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UrgentAnnouncement {
  id: string;
  slug: string;
  title: string;
  related_campaign_id: string | null;
  related_event_id: string | null;
}

function ctaFor(announcement: UrgentAnnouncement): { href: string; label: string } | null {
  if (announcement.related_campaign_id) return { href: "/applications", label: "Apply now" };
  if (announcement.related_event_id) return { href: "/events", label: "View event" };
  return null;
}

export function UrgentAnnouncementBanner({ announcements }: { announcements: UrgentAnnouncement[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    // localStorage is unavailable during SSR, so dismissed state must be hydrated client-side after mount.
    try {
      const stored = JSON.parse(localStorage.getItem("dismissed-announcements") ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(stored);
    } catch {
      setDismissed([]);
    }
  }, []);

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("dismissed-announcements", JSON.stringify(next));
  }

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2" role="region" aria-label="Urgent announcements">
      {visible.map((announcement) => {
        const cta = ctaFor(announcement);
        return (
          <div key={announcement.id} className="flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
            <Link href={`/announcements/${announcement.slug}`} className="flex-1 font-medium text-destructive hover:underline">
              {announcement.title}
            </Link>
            {cta ? (
              <Link href={cta.href} className="shrink-0 whitespace-nowrap text-sm font-semibold text-destructive hover:underline">
                {cta.label} →
              </Link>
            ) : null}
            <Button variant="ghost" size="icon" className="size-6" onClick={() => dismiss(announcement.id)} aria-label="Dismiss">
              <X className="size-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
