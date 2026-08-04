import { clientEnv } from "@/lib/env.client";

export const dynamic = "force-static";

/**
 * Serves the Firebase Cloud Messaging service worker with the (public,
 * non-secret) web config injected. Route Handlers can't be at a literal
 * "/firebase-messaging-sw.js" static path, but a folder named exactly that
 * containing route.ts works and Next.js serves it at the root — required
 * because FCM service workers must be scoped at the origin root.
 *
 * This is also the app's only service worker, so it doubles as a very
 * conservative offline shell: it caches nothing by default and only falls
 * back to /offline when a page navigation fails with no network. It
 * deliberately never caches API responses, admin pages, or any application
 * data (ballots, application answers, suggestions) — see PWA requirements.
 */
export async function GET() {
  const config = {
    apiKey: clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const script = `
const OFFLINE_CACHE = 'offline-shell-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Only intercept top-level page navigations to show an offline fallback.
// Everything else (API calls, data fetches) passes straight through to the
// network, uncached — private application data must never be cached.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'YM Student Council';
  const options = {
    body: payload.notification && payload.notification.body,
    icon: '/icons/icon.svg',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/notifications';
  event.waitUntil(clients.openWindow(link));
});
`.trim();

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
