"use client";

import { useEffect } from "react";

/** Registers the service worker for the offline shell; safe without notification permission. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {
        // Non-fatal: offline fallback and push simply won't be available.
      });
    }
  }, []);

  return null;
}
