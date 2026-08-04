"use client";

import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
import { getFirebaseApp } from "@/lib/firebase/client";
import { clientEnv } from "@/lib/env.client";

/**
 * Firebase Analytics is prepared but disabled by default (NEXT_PUBLIC_ENABLE_FIREBASE_ANALYTICS).
 * Even when enabled, `logSafeAnalyticsEvent` below refuses to send any
 * parameter whose key looks like it could carry personally identifiable
 * information — names, emails, application/survey/suggestion content, etc.
 * must never reach analytics.
 */
const BLOCKED_PARAM_KEY_PATTERN =
  /name|email|address|phone|answer|message|content|subject|comment|note|statement/i;

let cachedAnalytics: Analytics | null | undefined;

async function getAnalyticsInstance(): Promise<Analytics | undefined> {
  if (!clientEnv.NEXT_PUBLIC_ENABLE_FIREBASE_ANALYTICS) return undefined;
  if (cachedAnalytics !== undefined) return cachedAnalytics ?? undefined;

  const app = getFirebaseApp();
  if (!app || typeof window === "undefined" || !(await isSupported())) {
    cachedAnalytics = null;
    return undefined;
  }
  cachedAnalytics = getAnalytics(app);
  return cachedAnalytics;
}

export async function logSafeAnalyticsEvent(
  eventName: string,
  params: Record<string, string | number | boolean> = {},
): Promise<void> {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => !BLOCKED_PARAM_KEY_PATTERN.test(key)),
  );

  logEvent(analytics, eventName, safeParams);
}
