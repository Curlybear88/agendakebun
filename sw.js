const CACHE = "rkk-v1";
const SHELL = ["./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== "kebun-state").map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});

// Pengingat latar belakang (didukung Chrome Android untuk PWA terpasang; waktunya tidak presisi)
self.addEventListener("periodicsync", e => {
  if (e.tag !== "kebun-remind") return;
  e.waitUntil((async () => {
    const c = await caches.open("kebun-state");
    const res = await c.match("state.json");
    if (!res) return;
    const st = await res.json();
    if (st.off) return;
    const now = Date.now();
    let n = 0;
    for (const r of st.rem) {
      if (r.t > now || now - r.t > 18 * 36e5 || st.fired[r.id] || st.done[r.k]) continue;
      st.fired[r.id] = 1;
      if (++n <= 4) await self.registration.showNotification(r.title, { body: r.body, tag: r.id, icon: "icon-192.png", badge: "icon-192.png", data: { k: r.k } });
    }
    if (n > 4) await self.registration.showNotification("Pengingat pekerjaan", { body: "Ada " + n + " pekerjaan menunggu.", tag: "ringkas" });
    await c.put("state.json", new Response(JSON.stringify(st)));
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./index.html")));
});
