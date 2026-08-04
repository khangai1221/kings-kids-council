"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { clientEnv, isFirebaseMessagingConfigured } from "@/lib/env.client";

const firebaseConfig = {
  apiKey: clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cachedApp: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp | undefined {
  if (!isFirebaseMessagingConfigured) return undefined;
  if (!cachedApp) {
    cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return cachedApp;
}

/** Resolves to `undefined` in unsupported browsers (e.g. Safari private mode, no SW support). */
export async function getFirebaseMessaging(): Promise<Messaging | undefined> {
  if (typeof window === "undefined" || !isFirebaseMessagingConfigured) return undefined;
  if (!(await isSupported())) return undefined;
  const app = getFirebaseApp();
  return app ? getMessaging(app) : undefined;
}
