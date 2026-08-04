import Link from "next/link";
import { Vote } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/require";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Voting" };

export default async function VotingPage() {
  await requireOnboardedUser();
  const supabase = createSupabaseServerClient();
  const { data: elections } = await supabase
    .from("elections")
    .select("*")
    .not("status", "in", "(draft,cancelled)")
    .order("opens_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Voting" description="Student council elections you're eligible to vote in." />
      {!elections || elections.length === 0 ? (
        <EmptyState icon={Vote} title="No active elections right now." description="New elections will appear here when they open." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {elections.map((election) => (
            <Link key={election.id} href={`/voting/${election.slug}`}>
              <Card className="h-full transition-colors hover:bg-secondary/40">
                <CardContent className="p-5">
                  <StatusBadge status={election.status} />
                  <p className="mt-2 font-semibold text-foreground">{election.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {election.status === "open" ? "Closes " : "Opens "}
                    {new Date(election.status === "open" ? election.closes_at : election.opens_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
