"use server";

import { revalidatePath } from "next/cache";
import { assertCurrentUser, assertCapability } from "@/lib/auth/require";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { recordAuditEvent } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/service";
import type { Json } from "@/types/database";
import type { AnswerValue, AnswersByQuestionKey } from "@/lib/forms/types";
import type { EventStatus } from "@/lib/constants";

export async function registerForEvent(eventId: string, answers: AnswersByQuestionKey = {}): Promise<ActionResult<{ status: string; waitlistPosition: number | null }>> {
  return runAction(async () => {
    await assertCurrentUser();
    const supabase = createSupabaseServerClient();

    const { data: event } = await supabase.from("events").select("registration_form_version_id").eq("id", eventId).maybeSingle();
    let payload: { question_id: string; value: AnswerValue }[] = [];
    if (event?.registration_form_version_id) {
      const { data: questions } = await supabase.from("form_questions").select("id, key").eq("form_version_id", event.registration_form_version_id);
      const idByKey = new Map((questions ?? []).map((q) => [q.key, q.id]));
      payload = Object.entries(answers)
        .map(([key, value]) => ({ question_id: idByKey.get(key), value }))
        .filter((a): a is { question_id: string; value: AnswerValue } => Boolean(a.question_id));
    }

    const { data, error } = await supabase.rpc("register_for_event", { p_event_id: eventId, p_answers: payload as unknown as Json });
    if (error) throw new Error(error.message);

    const result = data as unknown as { status: string; waitlist_position: number | null };
    return { status: result.status, waitlistPosition: result.waitlist_position };
  });
}

export async function cancelEventRegistration(registrationId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    const { data: promotedId, error } = await supabase.rpc("cancel_event_registration", { p_registration_id: registrationId });
    if (error) throw new Error(error.message);

    if (promotedId) {
      const { data: promoted } = await supabase
        .from("event_registrations")
        .select("student_id, event_id, events(title, slug)")
        .eq("id", promotedId as string)
        .maybeSingle();
      if (promoted) {
        const event = (promoted as unknown as { events: { title: string; slug: string } }).events;
        await createNotification({
          userId: promoted.student_id,
          type: "event_waitlist_promoted",
          title: "You're off the waitlist!",
          message: `A spot opened up for ${event?.title}. You are now registered.`,
          link: `/events/${event?.slug}`,
        });
      }
    }

    revalidatePath("/events");
    return undefined;
  });
}

export async function toggleSavedEvent(eventId: string, save: boolean): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCurrentUser();
    const supabase = createSupabaseServerClient();
    if (save) {
      await supabase.from("saved_events").upsert({ event_id: eventId, student_id: user.profile.id }, { onConflict: "event_id,student_id" });
    } else {
      await supabase.from("saved_events").delete().eq("event_id", eventId).eq("student_id", user.profile.id);
    }
    revalidatePath("/events");
    return undefined;
  });
}

export async function createEvent(input: {
  title: string;
  shortDescription?: string;
  fullDescription?: string;
  categoryId?: string;
  organizer?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  capacity?: number;
  waitlistCapacity?: number;
  eligibleGradeLevelIds: string[];
  registrationOpensAt?: string;
  registrationClosesAt?: string;
}): Promise<ActionResult<{ eventId: string }>> {
  return runAction(async () => {
    await assertCapability("events.manage");
    const supabase = createSupabaseServerClient();
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        title: input.title,
        slug,
        short_description: input.shortDescription || null,
        full_description: input.fullDescription || null,
        category_id: input.categoryId || null,
        organizer: input.organizer || null,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        location: input.location || null,
        capacity: input.capacity ?? null,
        waitlist_capacity: input.waitlistCapacity ?? null,
        eligible_grade_level_ids: input.eligibleGradeLevelIds,
        registration_opens_at: input.registrationOpensAt || null,
        registration_closes_at: input.registrationClosesAt || null,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;

    await recordAuditEvent({ action: "event.created", resourceType: "event", resourceId: event.id });
    revalidatePath("/admin/events");
    return { eventId: event.id };
  });
}

export async function updateEventStatus(eventId: string, status: EventStatus, reason?: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("events.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("events")
      .update({ status, cancellation_reason: status === "cancelled" ? (reason ?? null) : null })
      .eq("id", eventId);
    if (error) throw error;

    if (status === "cancelled") {
      const { data: registrations } = await supabase
        .from("event_registrations")
        .select("student_id")
        .eq("event_id", eventId)
        .in("status", ["registered", "waitlisted"]);
      const { data: event } = await supabase.from("events").select("title").eq("id", eventId).maybeSingle();
      for (const registration of registrations ?? []) {
        await createNotification({
          userId: registration.student_id,
          type: "event_cancelled",
          title: "Event cancelled",
          message: `${event?.title} has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
        });
      }
      await recordAuditEvent({ action: "event.cancelled", resourceType: "event", resourceId: eventId, reason });
    }

    revalidatePath("/admin/events");
    return undefined;
  });
}

export async function markAttendance(registrationId: string, eventId: string, attended: boolean): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await assertCapability("events.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("event_attendance")
      .upsert(
        { event_id: eventId, registration_id: registrationId, attended, marked_by: user.profile.id, marked_at: new Date().toISOString() },
        { onConflict: "registration_id" },
      );
    if (error) throw error;
    revalidatePath(`/admin/events/${eventId}`);
    return undefined;
  });
}

export async function promoteWaitlisted(registrationId: string, eventId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await assertCapability("events.manage");
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.rpc("promote_event_registration", { p_registration_id: registrationId });
    if (error) throw new Error(error.message);
    revalidatePath(`/admin/events/${eventId}`);
    return undefined;
  });
}
