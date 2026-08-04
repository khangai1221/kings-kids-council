import Image from "next/image";
import { UserCircle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Council Members" };

export default async function CouncilMembersPage() {
  const supabase = createSupabaseServerClient();
  const { data: members } = await supabase
    .from("council_members")
    .select("*, council_positions(title)")
    .eq("status", "published")
    .order("sort_order");

  return (
    <div>
      <PageHeader title="Council members" description="Meet this year's student council." />

      {!members || members.length === 0 ? (
        <EmptyState title="No published council members yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const position = (member as unknown as { council_positions: { title: string } | null }).council_positions;
            return (
              <Card key={member.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    {member.photo_url ? (
                      <Image src={member.photo_url} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                        <UserCircle className="size-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{member.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {position?.title}
                        {member.grade_level_label ? ` · ${member.grade_level_label}` : ""}
                      </p>
                    </div>
                  </div>
                  {member.short_bio ? <p className="mt-3 text-sm text-muted-foreground">{member.short_bio}</p> : null}
                  {member.responsibilities ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Responsibilities: </span>
                      {member.responsibilities}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
