/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification received from Web Push Gateway
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'HostelOps Alert';
    const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
      body: data.body || 'You have an update in HostelOps.',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      data: {
        url: data.url || '/',
        tab: data.tab,
      },
      tag: data.tag || 'hostelops-notification',
      renotify: true,
      vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options as NotificationOptions));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('HostelOps Alert', {
        body: text,
        icon: '/pwa-192x192.png',
        badge: '/badge-72x72.png',
        data: { url: '/' },
      })
    );
  }
});

// User tapped notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (event.notification.data?.tab) {
            client.postMessage({
              type: 'NAVIGATE_TAB',
              tab: event.notification.data.tab,
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
