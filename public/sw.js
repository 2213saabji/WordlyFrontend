// GuessWord service worker: shows the daily reminder push and opens the
// game when it's tapped. Nothing is cached — the site works exactly as it
// does without this file. Registered by lib/push.ts; the payload comes from
// the backend's daily reminder job ({ title, body, url, tag }).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Today's word is waiting", {
      body: data.body || "Five letters, six tries.",
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/badge",
      // Same tag: a newer reminder replaces an unread older one.
      tag: data.tag || "daily-reminder",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  // Only ever open our own site.
  const url = target.origin === self.location.origin ? target.href : self.location.origin + "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if ("navigate" in open) await open.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
