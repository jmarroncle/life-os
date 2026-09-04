// Service worker mínimo, solo para Web Push (ver /activar/[token] y
// src/lib/push.ts). No cachea nada — no es el service worker de una PWA
// offline-first, la app sigue necesitando red para todo.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Life OS", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Life OS", {
      body: data.body || "",
      icon: "/icon.svg",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/"));
});
