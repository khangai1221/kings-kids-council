import { requireCapability } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateAnnouncementDialog } from "@/app/admin/announcements/create-announcement-dialog";
import { AnnouncementStatusSelect } from "@/app/admin/announcements/status-select";
import { Megaphone } from "lucide-react";

export const metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireCapability("announcements.manage");
  const supabase = createSupabaseServerClient();
  const { data: announcements } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Announcements" actions={<CreateAnnouncementDialog />} />
      {!announcements || announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="responsive-table">
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Audience</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell data-label="Title" className="font-medium">
                    {announcement.pinned ? "📌 " : ""}{announcement.urgent ? "🔴 " : ""}{announcement.title}
                  </TableCell>
                  <TableCell data-label="Audience" className="capitalize">{announcement.audience.replace(/_/g, " ")}</TableCell>
                  <TableCell data-label="Status"><AnnouncementStatusSelect id={announcement.id} status={announcement.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
