"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { getFirebaseMessaging } from "@/lib/firebase/client";
import { clientEnv, isFirebaseMessagingConfigured } from "@/lib/env.client";
import { registerPushToken, removePushToken } from "@/actions/push-subscriptions";

export type PushPermissionState = "unsupported" | "default" | "denied" | "granted";

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Other";
}

export function useFcmToken() {
  const [permission, setPermission] = useState<PushPermissionState>("unsupported");
  const [token, setToken] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (!isFirebaseMessagingConfigured || typeof window === "undefined" || !("Notification" in window)) return;
    // The Notification API only exists in the browser, so permission state must be read post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(Notification.permission as PushPermissionState);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void getFirebaseMessaging().then((messaging) => {
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        toast(payload.notification?.title ?? "New notification", {
          description: payload.notification?.body,
        });
      });
    });
    return () => unsubscribe?.();
  }, []);

  const enablePush = useCallback(async () => {
    if (!isFirebaseMessagingConfigured) {
      toast.error("Push notifications are not configured for this deployment yet.");
      return;
    }
    setIsRegistering(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PushPermissionState);
      if (permissionResult !== "granted") return;

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      const fcmToken = await getToken(messaging, {
        vapidKey: clientEnv.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      if (!fcmToken) {
        toast.error("Could not get a notification token. Please try again.");
        return;
      }

      setToken(fcmToken);
      const result = await registerPushToken({ fcmToken, browser: detectBrowser() });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Push notifications enabled on this device.");
    } catch (error) {
      console.error("Failed to enable push notifications", error);
      toast.error("Something went wrong enabling push notifications.");
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const disablePush = useCallback(async () => {
    if (!token) return;
    await removePushToken(token);
    setToken(null);
    toast.success("Push notifications disabled on this device.");
  }, [token]);

  return { permission, token, isRegistering, isConfigured: isFirebaseMessagingConfigured, enablePush, disablePush };
}
