import Link from "next/link";
import { CheckSquare, FileText, Lightbulb, Mail } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings/service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/shared/rich-text";

export const metadata = { title: "Student Council" };

export default async function CouncilPage() {
  const supabase = createSupabaseServerClient();
  const settings = await getSiteSettings();
  const { data: currentTerm } = await supabase.from("council_terms").select("*").eq("is_current", true).maybeSingle();
  const { data: positions } = await supabase.from("council_positions").select("*").eq("is_active", true).order("sort_order");

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-[28px]">Student Council</h1>
        {currentTerm ? <p className="text-sm text-muted-foreground">{currentTerm.title}</p> : null}
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Our mission</h2>
        {settings.council_mission ? (
          <RichText content={settings.council_mission} />
        ) : (
          <p className="text-sm text-muted-foreground">
            The student council represents the voice of every student, organizes school events, and works
            with school leadership to improve student life.
          </p>
        )}
      </section>

      {positions && positions.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Council positions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {positions.map((position) => (
              <Card key={position.id}>
                <CardContent className="p-4">
                  <p className="font-medium text-foreground">{position.title}</p>
                  {position.description ? <p className="mt-1 text-sm text-muted-foreground">{position.description}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">How to participate</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex flex-col items-start gap-2 p-4">
              <FileText className="size-5 text-primary" />
              <p className="text-sm font-medium">Apply for a position</p>
              <Button asChild size="sm" variant="link" className="h-auto p-0"><Link href="/applications">Applications</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-start gap-2 p-4">
              <CheckSquare className="size-5 text-primary" />
              <p className="text-sm font-medium">Vote in a poll</p>
              <Button asChild size="sm" variant="link" className="h-auto p-0"><Link href="/polls">Polls</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-start gap-2 p-4">
              <Lightbulb className="size-5 text-primary" />
              <p className="text-sm font-medium">Share an idea</p>
              <Button asChild size="sm" variant="link" className="h-auto p-0"><Link href="/suggestions/new">Suggestions</Link></Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Current members</h2>
        <Button asChild variant="outline"><Link href="/council/members">View council members</Link></Button>
      </section>

      {settings.contact_email ? (
        <section className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-4" />
          Contact the council at{" "}
          <a href={`mailto:${settings.contact_email}`} className="text-primary underline">{settings.contact_email}</a>
        </section>
      ) : null}
    </div>
  );
}
