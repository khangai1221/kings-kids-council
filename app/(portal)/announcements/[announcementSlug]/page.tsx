import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { RichText } from "@/components/shared/rich-text";
import { markAnnouncementRead } from "@/actions/announcements";

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ announcementSlug: string }> }) {
  await requireOnboardedUser();
  const { announcementSlug } = await params;
  const supabase = createSupabaseServerClient();

  const { data: announcement } = await supabase.from("announcements").select("*").eq("slug", announcementSlug).maybeSingle();
  if (!announcement) notFound();

  await markAnnouncementRead(announcement.id);

  return (
    <div className="max-w-2xl">
      <PageHeader title={announcement.title} description={new Date(announcement.publish_at ?? announcement.created_at).toLocaleDateString()} />
      {announcement.content ? <RichText content={announcement.content} /> : <p className="text-muted-foreground">{announcement.summary}</p>}
    </div>
  );
}
