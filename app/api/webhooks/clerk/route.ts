import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { env } from "@/lib/env.server";
import {
  syncClerkUserCreatedOrUpdated,
  syncClerkUserDeleted,
  type ClerkUserWebhookPayload,
} from "@/lib/webhooks/clerk-sync";

export const runtime = "nodejs";

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserWebhookPayload;
}

export async function POST(request: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await request.text();
  const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET);

  let event: ClerkWebhookEvent;
  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await syncClerkUserCreatedOrUpdated(event.data);
        break;
      case "user.deleted":
        await syncClerkUserDeleted(event.data);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`Clerk webhook (${event.type}) processing failed`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
