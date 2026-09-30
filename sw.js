// Service worker : l'app entière est mise en cache pour fonctionner sans réseau.
// Incrémenter VERSION à chaque publication pour que les téléphones récupèrent la mise à jour.
const VERSION = "v1.0.1";
const CACHE = `collecte-guidee-${VERSION}`;
const FICHIERS = [
  "./", "index.html", "styles.css", "manifest.webmanifest",
  "src/app.js", "src/ui.js", "src/i18n.js", "src/store.js", "src/sync.js",
  "lib/engine.js", "lib/protocole.js", "lib/commun.js", "lib/expr.js", "lib/formulaire.js", "lib/openrosa.js",
  "config/instance.json", "config/protocole.json",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k.startsWith("collecte-guidee-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.includes("/.netlify/")) return; // envois : jamais de cache
  // Configuration : le réseau d'abord (pour recevoir un protocole mis à jour), le cache sinon.
  if (url.pathname.includes("/config/")) {
    e.respondWith(fetch(e.request).then((r) => {
      const copie = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copie));
      return r;
    }).catch(() => caches.match(e.request)));
    return;
  }
  // Pages : l'app en cache (fonctionne hors ligne).
  if (e.request.mode === "navigate") {
    e.respondWith(caches.match("index.html").then((r) => r || fetch(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
