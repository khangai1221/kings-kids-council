import "server-only";
import { z } from "zod";
import { clientEnv } from "@/lib/env.client";

/**
 * Server-only environment variables (secrets + server configuration).
 * The `server-only` import above makes bundling this file into a Client
 * Component a build-time error, so secrets can never leak into the browser
 * bundle through this module.
 */
const serverEnvSchema = z.object({
  ALLOWED_EMAIL_DOMAIN: z.string().min(1).default("kingskids.mn"),
  APP_TIMEZONE: z.string().min(1).default("Asia/Ulaanbaatar"),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().optional().default(""),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(""),
});

function loadServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    ALLOWED_EMAIL_DOMAIN: process.env.ALLOWED_EMAIL_DOMAIN,
    APP_TIMEZONE: process.env.APP_TIMEZONE,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  });

  if (!parsed.success) {
    console.error("Invalid server environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error(
      "Invalid server environment variables. Check .env.example and your .env.local file.",
    );
  }

  return parsed.data;
}

const serverEnv = loadServerEnv();

/** Combined env for server-side code: public values + secrets. */
export const env = {
  ...clientEnv,
  ...serverEnv,
};

export const isFirebaseAdminConfigured = Boolean(
  serverEnv.FIREBASE_PROJECT_ID && serverEnv.FIREBASE_CLIENT_EMAIL && serverEnv.FIREBASE_PRIVATE_KEY,
);
