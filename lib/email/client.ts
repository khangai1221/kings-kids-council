import "server-only";
import { Resend } from "resend";
import { env, isEmailConfigured } from "@/lib/env.server";

let cachedClient: Resend | undefined;

/** `undefined` when RESEND_API_KEY is not configured (local dev without email). */
function getResendClient(): Resend | undefined {
  if (!isEmailConfigured) return undefined;
  if (!cachedClient) cachedClient = new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  title: string;
  body: string;
  link?: string;
}

/** Sends a simple notification-style email. Silently no-ops if email isn't configured. */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = getResendClient();
  if (!client) return false;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 12px;">${params.title}</h2>
      <p style="margin: 0 0 20px; color: #333; white-space: pre-wrap;">${params.body}</p>
      ${
        params.link
          ? `<a href="${env.NEXT_PUBLIC_APP_URL}${params.link}" style="display: inline-block; padding: 10px 16px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">View in the portal</a>`
          : ""
      }
    </div>
  `;

  const { error } = await client.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html,
  });

  if (error) {
    console.error("Failed to send email", error);
    return false;
  }
  return true;
}
