import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { env, isFirebaseAdminConfigured } from "@/lib/env.server";

let cachedApp: App | undefined;

function getFirebaseAdminApp(): App | undefined {
  if (!isFirebaseAdminConfigured) return undefined;
  if (!cachedApp) {
    cachedApp = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            // Service-account keys are stored as a single-line env var with
            // literal "\n" sequences; unescape them into real newlines.
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
        });
  }
  return cachedApp;
}

/** `undefined` when Firebase Admin credentials are not configured (local dev without push). */
export function getFirebaseAdminMessaging(): Messaging | undefined {
  const app = getFirebaseAdminApp();
  return app ? getMessaging(app) : undefined;
}
