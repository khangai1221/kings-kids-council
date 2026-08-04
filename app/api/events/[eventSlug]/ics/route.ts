import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOnboardedUser } from "@/lib/auth/require";
import { generateIcsEvent } from "@/lib/ics/generate";

export async function GET(_request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  await requireOnboardedUser();
  const { eventSlug } = await params;
  const supabase = createSupabaseServerClient();

  const { data: event } = await supabase.from("events").select("*").eq("slug", eventSlug).maybeSingle();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const ics = generateIcsEvent({
    uid: event.id,
    title: event.title,
    description: event.short_description,
    location: event.location,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
    },
  });
}
