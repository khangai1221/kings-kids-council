import Link from "next/link";
import { Megaphone, Pin } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .order("pinned", { ascending: false })
    .order("publish_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Announcements" description="News and updates from the student council." />
      {!announcements || announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet." />
      ) : (
        <div className="space-y-2">
          {announcements.map((announcement) => (
            <Link key={announcement.id} href={`/announcements/${announcement.slug}`}>
              <Card className="transition-colors hover:bg-secondary/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    {announcement.pinned ? <Pin className="size-3.5 text-accent" /> : null}
                    {announcement.urgent ? <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">Urgent</span> : null}
                    <p className="font-medium text-foreground">{announcement.title}</p>
                  </div>
                  {announcement.summary ? <p className="mt-1 text-sm text-muted-foreground">{announcement.summary}</p> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
