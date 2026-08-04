import Link from "next/link";
import { Vote } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Polls" };

export default async function PollsPage() {
  await requireOnboardedUser();
  const supabase = createSupabaseServerClient();

  const { data: polls } = await supabase
    .from("polls")
    .select("*")
    .not("status", "in", "(draft,archived)")
    .order("closes_at", { ascending: true, nullsFirst: false });

  return (
    <div>
      <PageHeader title="Polls" description="Quick single-question polls from the council." />

      {!polls || polls.length === 0 ? (
        <EmptyState icon={Vote} title="No polls available right now." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <Link key={poll.id} href={`/polls/${poll.slug}`}>
              <Card className="h-full transition-colors hover:bg-secondary/40">
                <CardContent className="p-5">
                  <div className="mb-2">
                    <StatusBadge status={poll.status} />
                  </div>
                  <p className="font-semibold text-foreground">{poll.title}</p>
                  {poll.description ? <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{poll.description}</p> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
